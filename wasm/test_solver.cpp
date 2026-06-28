#include <iostream>
#include <string>
#include <vector>
#include <sstream>

// Forward declarations from solver.cpp
extern "C" {
const char* solve_cube_wasm(const char* stickers_str_c, const char* algorithm_c);
const char* apply_move_wasm(const char* stickers_str_c, const char* move_c);
}

// Helper to split string by commas for parsing JSON array
std::vector<std::string> parse_json_moves(const std::string& json) {
    std::vector<std::string> moves;
    size_t start = json.find("[\"");
    if (start == std::string::npos) return moves; // empty or error
    start += 2;
    size_t end = json.find("\"]", start);
    if (end == std::string::npos) {
        // Might be empty array []
        if (json.find("[]") != std::string::npos) return moves;
        return moves;
    }
    
    std::string moves_str = json.substr(start, end - start);
    std::stringstream ss(moves_str);
    std::string move;
    while (std::getline(ss, move, ',')) {
        // Remove quotes and whitespace
        move.erase(std::remove(move.begin(), move.end(), '\"'), move.end());
        move.erase(std::remove(move.begin(), move.end(), ' '), move.end());
        moves.push_back(move);
    }
    return moves;
}

int main() {
    std::cout << "===========================================\n";
    std::cout << "Running Systematic Depth Verification\n";
    std::cout << "===========================================\n\n";

    std::vector<std::vector<std::string>> scrambles = {
        {"R"},
        {"R", "U"},
        {"R", "U", "F'"},
        {"R", "U", "F'", "R2"},
        {"R", "U", "F'", "R2", "U'"},
        {"R", "U", "F'", "R2", "U'", "F"},
        {"R", "U", "F'", "R2", "U'", "F", "R"},
        {"R", "U", "F'", "R2", "U'", "F", "R", "U'"},
        {"R", "U", "F'", "R2", "U'", "F", "R", "U'", "F2"}
    };

    for (size_t d = 0; d < scrambles.size(); ++d) {
        std::string state = "WWWWYYYYGGGGBBBBOOOORRRR";
        std::cout << "--- Scramble Depth " << (d + 1) << " --- \n";
        std::cout << "Sequence: ";
        for (const auto& m : scrambles[d]) {
            std::cout << m << " ";
            state = apply_move_wasm(state.c_str(), m.c_str());
        }
        std::cout << "\n";

        auto run_test = [&](const std::string& algo) {
            std::string res_json = solve_cube_wasm(state.c_str(), algo.c_str());
            // Parse result JSON simple values
            size_t nodes_pos = res_json.find("\"nodes_explored\":");
            size_t time_pos = res_json.find("\"time_ms\":");
            size_t status_pos = res_json.find("\"status\":");
            
            std::string status = "error";
            if (status_pos != std::string::npos) {
                status = res_json.substr(status_pos + 10, 7); // "success" or "error"
            }
            int nodes = 0;
            if (nodes_pos != std::string::npos) {
                nodes = std::stoi(res_json.substr(nodes_pos + 17, res_json.find(",", nodes_pos) - (nodes_pos + 17)));
            }
            double time_ms = 0;
            if (time_pos != std::string::npos) {
                time_ms = std::stod(res_json.substr(time_pos + 10, res_json.find(",", time_pos) - (time_pos + 10)));
            }

            std::cout << "  " << algo << ": " << status << " | nodes: " << nodes << " | time: " << time_ms << " ms\n";
        };

        run_test("bidirectional");
        run_test("bfs");
        run_test("iddfs");
        std::cout << "\n";
    }

    return 0;
}
