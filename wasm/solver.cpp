#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <chrono>
#include <sstream>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

// Represents the 2x2 Rubik's Cube state using 8 corners
// perm: 0..7 corner pieces
// orient: 0..2 orientation twists (0: U/D color on U/D face, 1: CW, 2: CCW)
struct CubeState {
    char perm[8];
    char orient[8];

    bool operator==(const CubeState& other) const {
        for (int i = 0; i < 8; ++i) {
            if (perm[i] != other.perm[i] || orient[i] != other.orient[i]) return false;
        }
        return true;
    }

    // Packs the 8 corners into a single 40-bit integer
    uint64_t pack() const {
        uint64_t val = 0;
        for (int i = 0; i < 8; ++i) {
            val |= (uint64_t)perm[i] << (i * 5);
            val |= (uint64_t)orient[i] << (i * 5 + 3);
        }
        return val;
    }

    // Unpacks a 40-bit integer into CubeState
    static CubeState unpack(uint64_t val) {
        CubeState state;
        for (int i = 0; i < 8; ++i) {
            state.perm[i] = (val >> (i * 5)) & 7;
            state.orient[i] = (val >> (i * 5 + 3)) & 3;
        }
        return state;
    }
};

// Define structure to map corner positions to their 3 stickers in the 24-character string
struct CornerStickers {
    int u_or_d_idx;
    int f_or_b_idx;
    int l_or_r_idx;
};

// Sticker indices mapping based on 24-sticker unfolded layout:
// U: 0..3, D: 4..7, F: 8..11, B: 12..15, L: 16..19, R: 20..23
static const CornerStickers corner_sticker_indices[8] = {
    {2, 8, 17},  // 0: UFL (U, F, L)
    {3, 20, 9},  // 1: UFR (U, R, F)
    {1, 12, 21}, // 2: UBR (U, B, R)
    {0, 16, 13}, // 3: UBL (U, L, B)
    {4, 19, 10}, // 4: DFL (D, L, F)
    {5, 11, 22}, // 5: DFR (D, F, R)
    {7, 23, 14}, // 6: DBR (D, R, B)
    {6, 15, 18}  // 7: DBL (D, B, L)
};

// Clockwise color sequences for the 8 physical corner pieces (U/D color is always physical_pieces[i][0])
// U=0, D=1, F=2, B=3, L=4, R=5
static const int physical_pieces[8][3] = {
    {0, 2, 4}, // 0: UFL (White, Green, Orange)
    {0, 5, 2}, // 1: UFR (White, Red, Green)
    {0, 3, 5}, // 2: UBR (White, Blue, Red)
    {0, 4, 3}, // 3: UBL (White, Orange, Blue)
    {1, 4, 2}, // 4: DFL (Yellow, Orange, Green)
    {1, 2, 5}, // 5: DFR (Yellow, Green, Red)
    {1, 5, 3}, // 6: DBR (Yellow, Red, Blue)
    {1, 3, 4}  // 7: DBL (Yellow, Blue, Orange)
};

// Maps color characters to face indices
int char_to_face(char c) {
    switch (c) {
        case 'W': case 'w': return 0; // U
        case 'Y': case 'y': return 1; // D
        case 'G': case 'g': return 2; // F
        case 'B': case 'b': return 3; // B
        case 'O': case 'o': return 4; // L
        case 'R': case 'r': return 5; // R
        default: return -1;
    }
}

// Maps face/type to readable move string
std::string move_to_string(int face, int type) {
    static const char faces[] = {'U', 'D', 'F', 'B', 'L', 'R'};
    static const std::string types[] = {"", "'", "2"};
    return std::string(1, faces[face]) + types[type];
}

// Returns the inverse of a move
int get_inverse_move(int move) {
    int face = move / 3;
    int type = move % 3;
    if (type == 0) return face * 3 + 1; // CW -> CCW
    if (type == 1) return face * 3 + 0; // CCW -> CW
    return move; // Double is its own inverse
}

// Applies a move (face 0..5: U, D, F, B, L, R; type 0..2: CW, CCW, Double)
CubeState apply_move(const CubeState& state, int face, int type) {
    CubeState next_state = state;
    
    // Cycles for each face (CW looking at the face)
    static const int cycles[6][4] = {
        {3, 2, 1, 0}, // U
        {4, 5, 6, 7}, // D
        {0, 1, 5, 4}, // F
        {2, 3, 7, 6}, // B
        {3, 0, 4, 7}, // L
        {1, 2, 6, 5}  // R
    };
    
    // Whether face rotates orientations of corners (U & D don't, F, B, L, R do)
    static const int orient_change[6] = {0, 0, 1, 1, 1, 1};
    
    const int* cycle = cycles[face];
    int a = cycle[0], b = cycle[1], c = cycle[2], d = cycle[3];
    
    if (type == 0) { // CW: a -> b -> c -> d -> a
        next_state.perm[b] = state.perm[a];
        next_state.perm[c] = state.perm[b];
        next_state.perm[d] = state.perm[c];
        next_state.perm[a] = state.perm[d];
        
        if (orient_change[face]) {
            next_state.orient[b] = (state.orient[a] + 1) % 3;
            next_state.orient[c] = (state.orient[b] + 2) % 3;
            next_state.orient[d] = (state.orient[c] + 1) % 3;
            next_state.orient[a] = (state.orient[d] + 2) % 3;
        } else {
            next_state.orient[b] = state.orient[a];
            next_state.orient[c] = state.orient[b];
            next_state.orient[d] = state.orient[c];
            next_state.orient[a] = state.orient[d];
        }
    } else if (type == 1) { // CCW: d -> c -> b -> a -> d
        next_state.perm[a] = state.perm[b];
        next_state.perm[b] = state.perm[c];
        next_state.perm[c] = state.perm[d];
        next_state.perm[d] = state.perm[a];
        
        if (orient_change[face]) {
            next_state.orient[a] = (state.orient[b] + 2) % 3;
            next_state.orient[b] = (state.orient[c] + 1) % 3;
            next_state.orient[c] = (state.orient[d] + 2) % 3;
            next_state.orient[d] = (state.orient[a] + 1) % 3;
        } else {
            next_state.orient[a] = state.orient[b];
            next_state.orient[b] = state.orient[c];
            next_state.orient[c] = state.orient[d];
            next_state.orient[d] = state.orient[a];
        }
    } else if (type == 2) { // Double: a <-> c, b <-> d
        next_state.perm[a] = state.perm[c];
        next_state.perm[c] = state.perm[a];
        next_state.perm[b] = state.perm[d];
        next_state.perm[d] = state.perm[b];
        
        next_state.orient[a] = state.orient[c];
        next_state.orient[c] = state.orient[a];
        next_state.orient[b] = state.orient[d];
        next_state.orient[d] = state.orient[b];
    }
    
    return next_state;
}

// Whole-cube rotation around Y (U/D) axis, looking from top clockwise
CubeState rotate_y(const CubeState& state) {
    CubeState next_state = state;
    // U (3->2->1->0->3):
    next_state.perm[2] = state.perm[3]; next_state.orient[2] = state.orient[3];
    next_state.perm[1] = state.perm[2]; next_state.orient[1] = state.orient[2];
    next_state.perm[0] = state.perm[1]; next_state.orient[0] = state.orient[1];
    next_state.perm[3] = state.perm[0]; next_state.orient[3] = state.orient[0];
    
    // D' (7->6->5->4->7):
    next_state.perm[6] = state.perm[7]; next_state.orient[6] = state.orient[7];
    next_state.perm[5] = state.perm[6]; next_state.orient[5] = state.orient[6];
    next_state.perm[4] = state.perm[5]; next_state.orient[4] = state.orient[5];
    next_state.perm[7] = state.perm[4]; next_state.orient[7] = state.orient[4];
    
    return next_state;
}

// Whole-cube rotation around X (L/R) axis, looking from right clockwise (R is R CW, L is L CCW/L')
CubeState rotate_x(const CubeState& state) {
    CubeState next_state = state;
    // R (1->2->6->5->1):
    next_state.perm[2] = state.perm[1]; next_state.orient[2] = (state.orient[1] + 1) % 3;
    next_state.perm[6] = state.perm[2]; next_state.orient[6] = (state.orient[2] + 2) % 3;
    next_state.perm[5] = state.perm[6]; next_state.orient[5] = (state.orient[6] + 1) % 3;
    next_state.perm[1] = state.perm[5]; next_state.orient[1] = (state.orient[5] + 2) % 3;
    
    // L' (7->4->0->3->7):
    next_state.perm[4] = state.perm[7]; next_state.orient[4] = (state.orient[7] + 1) % 3;
    next_state.perm[0] = state.perm[4]; next_state.orient[0] = (state.orient[4] + 2) % 3;
    next_state.perm[3] = state.perm[0]; next_state.orient[3] = (state.orient[0] + 1) % 3;
    next_state.perm[7] = state.perm[3]; next_state.orient[7] = (state.orient[3] + 2) % 3;
    
    return next_state;
}

// Generates the 24 solved states corresponding to the 24 spatial rotations of a solved cube
std::vector<uint64_t> get_solved_states() {
    CubeState solved;
    for (int i = 0; i < 8; ++i) {
        solved.perm[i] = i;
        solved.orient[i] = 0;
    }
    std::vector<uint64_t> res;
    res.push_back(solved.pack());
    return res;
}

// Returns the cached 24 solved states
const std::vector<uint64_t>& get_cached_solved_states() {
    static std::vector<uint64_t> solved_states = get_solved_states();
    return solved_states;
}

// Validates a 24-character sticker string and outputs CubeState
bool validate_cube_state(const std::string& stickers_str, std::string& error_msg, CubeState& out_state) {
    if (stickers_str.length() != 24) {
        error_msg = "Invalid sticker string length (must be 24)";
        return false;
    }
    
    int counts[6] = {0};
    for (char c : stickers_str) {
        int face = char_to_face(c);
        if (face == -1) {
            error_msg = "Invalid color character in configuration";
            return false;
        }
        counts[face]++;
    }
    
    for (int i = 0; i < 6; ++i) {
        if (counts[i] != 4) {
            error_msg = "Invalid Rubik’s Cube configuration";
            return false;
        }
    }
    
    bool piece_used[8] = {false};
    for (int i = 0; i < 8; ++i) {
        int c1 = char_to_face(stickers_str[corner_sticker_indices[i].u_or_d_idx]);
        int c2 = char_to_face(stickers_str[corner_sticker_indices[i].f_or_b_idx]);
        int c3 = char_to_face(stickers_str[corner_sticker_indices[i].l_or_r_idx]);
        
        bool found = false;
        for (int j = 0; j < 8; ++j) {
            if (c1 == physical_pieces[j][0] && c2 == physical_pieces[j][1] && c3 == physical_pieces[j][2]) {
                out_state.perm[i] = j;
                out_state.orient[i] = 0;
                found = true;
            } else if (c2 == physical_pieces[j][0] && c3 == physical_pieces[j][1] && c1 == physical_pieces[j][2]) {
                out_state.perm[i] = j;
                out_state.orient[i] = 1;
                found = true;
            } else if (c3 == physical_pieces[j][0] && c1 == physical_pieces[j][1] && c2 == physical_pieces[j][2]) {
                out_state.perm[i] = j;
                out_state.orient[i] = 2;
                found = true;
            }
            
            if (found) {
                if (piece_used[j]) {
                    error_msg = "Invalid Rubik’s Cube configuration";
                    return false;
                }
                piece_used[j] = true;
                break;
            }
        }
        if (!found) {
            error_msg = "Invalid Rubik’s Cube configuration";
            return false;
        }
    }
    
    int sum_orient = 0;
    for (int i = 0; i < 8; ++i) {
        sum_orient += out_state.orient[i];
    }
    if (sum_orient % 3 != 0) {
        error_msg = "Invalid Rubik’s Cube configuration";
        return false;
    }
    
    return true;
}

struct SolveResult {
    std::vector<std::string> moves;
    int nodes_explored;
    double time_ms;
    bool success;
    std::string error_message;
};

// BFS Solver
SolveResult solve_bfs(uint64_t start_packed, const std::vector<uint64_t>& target_states) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int nodes_explored = 0;
    
    std::unordered_set<uint64_t> targets(target_states.begin(), target_states.end());
    
    if (targets.count(start_packed)) {
        auto end_time = std::chrono::high_resolution_clock::now();
        double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
        return {{}, 0, elapsed, true, ""};
    }
    
    std::queue<uint64_t> q;
    q.push(start_packed);
    
    std::unordered_map<uint64_t, uint64_t> parent_map;
    parent_map[start_packed] = 0;
    
    uint64_t collision_state = 0;
    bool found = false;
    bool limit_exceeded = false;
    const int NODE_LIMIT = 3800000;
    
    while (!q.empty()) {
        uint64_t curr = q.front();
        q.pop();
        nodes_explored++;
        
        if (nodes_explored > NODE_LIMIT) {
            limit_exceeded = true;
            break;
        }
        
        int last_move = -1;
        uint64_t parent_info = parent_map[curr];
        if (curr != start_packed) {
            last_move = parent_info >> 40;
        }
        int last_face = (last_move != -1) ? (last_move / 3) : -1;
        
        CubeState curr_state = CubeState::unpack(curr);
        for (int face = 0; face < 6; ++face) {
            if (face == last_face) continue;
            for (int type = 0; type < 3; ++type) {
                int move = face * 3 + type;
                CubeState next_state = apply_move(curr_state, face, type);
                uint64_t next_packed = next_state.pack();
                
                if (parent_map.find(next_packed) == parent_map.end()) {
                    parent_map[next_packed] = curr | ((uint64_t)move << 40);
                    
                    // Check-on-push target detection
                    if (targets.count(next_packed)) {
                        collision_state = next_packed;
                        found = true;
                        break;
                    }
                    
                    q.push(next_packed);
                }
            }
            if (found) break;
        }
        if (found) break;
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    
    if (found) {
        std::vector<std::string> path;
        uint64_t curr = collision_state;
        while (curr != start_packed) {
            uint64_t info = parent_map[curr];
            uint64_t parent = info & 0xFFFFFFFFFFULL;
            int move = info >> 40;
            path.push_back(move_to_string(move / 3, move % 3));
            curr = parent;
        }
        std::reverse(path.begin(), path.end());
        return {path, nodes_explored, elapsed, true, ""};
    }
    
    if (limit_exceeded) {
        return {{}, nodes_explored, elapsed, false, "Search limit exceeded (too many states). Please use Bidirectional BFS."};
    }
    
    return {{}, nodes_explored, elapsed, false, "No solution found (unsolvable state)"};
}

// Helper for IDDFS
bool iddfs_dldfs(uint64_t curr, int depth, int limit, int last_face,
                 const std::unordered_set<uint64_t>& targets,
                 std::vector<int>& path_moves,
                 std::unordered_set<uint64_t>& path_states,
                 std::unordered_map<uint64_t, int>& visited_remaining_depth,
                 int& nodes_explored,
                 int node_limit,
                 bool& limit_exceeded) {
    nodes_explored++;
    if (nodes_explored > node_limit) {
        limit_exceeded = true;
        return false;
    }
    
    // Transposition Table Pruning: skip if we searched this state with a larger or equal remaining depth
    int remaining_depth = limit - depth;
    auto it = visited_remaining_depth.find(curr);
    if (it != visited_remaining_depth.end() && it->second >= remaining_depth) {
        return false;
    }
    visited_remaining_depth[curr] = remaining_depth;
    
    CubeState curr_state = CubeState::unpack(curr);
    for (int face = 0; face < 6; ++face) {
        if (face == last_face) continue;
        for (int type = 0; type < 3; ++type) {
            int move = face * 3 + type;
            CubeState next_state = apply_move(curr_state, face, type);
            uint64_t next_packed = next_state.pack();
            
            if (path_states.count(next_packed)) continue;
            
            // Check-on-push target detection
            if (targets.count(next_packed)) {
                path_moves.push_back(move);
                return true;
            }
            
            // Avoid recursing if next step would hit limit
            if (depth + 1 < limit) {
                path_moves.push_back(move);
                path_states.insert(next_packed);
                
                if (iddfs_dldfs(next_packed, depth + 1, limit, face, targets, path_moves, path_states, visited_remaining_depth, nodes_explored, node_limit, limit_exceeded)) {
                    return true;
                }
                
                path_states.erase(next_packed);
                path_moves.pop_back();
            }
            
            if (limit_exceeded) {
                return false;
            }
        }
    }
    
    return false;
}

// IDDFS Solver
SolveResult solve_iddfs(uint64_t start_packed, const std::vector<uint64_t>& target_states) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int nodes_explored = 0;
    const int NODE_LIMIT = 3800000;
    bool limit_exceeded = false;
    
    std::unordered_set<uint64_t> targets(target_states.begin(), target_states.end());
    
    if (targets.count(start_packed)) {
        auto end_time = std::chrono::high_resolution_clock::now();
        double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
        return {{}, 0, elapsed, true, ""};
    }
    
    std::vector<int> path_moves;
    std::unordered_set<uint64_t> path_states;
    path_states.insert(start_packed);
    
    bool found = false;
    std::unordered_map<uint64_t, int> visited_remaining_depth;
    
    // God's number is at most 11 in HTM
    for (int limit = 1; limit <= 11; ++limit) {
        if (limit_exceeded) break;
        if (iddfs_dldfs(start_packed, 0, limit, -1, targets, path_moves, path_states, visited_remaining_depth, nodes_explored, NODE_LIMIT, limit_exceeded)) {
            found = true;
            break;
        }
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    
    if (found) {
        std::vector<std::string> path;
        for (int move : path_moves) {
            path.push_back(move_to_string(move / 3, move % 3));
        }
        return {path, nodes_explored, elapsed, true, ""};
    }
    
    if (limit_exceeded) {
        return {{}, nodes_explored, elapsed, false, "Search limit exceeded (too many states). Please use Bidirectional BFS."};
    }
    
    return {{}, nodes_explored, elapsed, false, "No solution found (unsolvable state)"};
}

// Bidirectional BFS Solver (Highly Optimized)
SolveResult solve_bidirectional_bfs(uint64_t start_packed, const std::vector<uint64_t>& target_states) {
    auto start_time = std::chrono::high_resolution_clock::now();
    int nodes_explored = 0;
    
    std::unordered_set<uint64_t> targets(target_states.begin(), target_states.end());
    
    if (targets.count(start_packed)) {
        auto end_time = std::chrono::high_resolution_clock::now();
        double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
        return {{}, 0, elapsed, true, ""};
    }
    
    std::queue<uint64_t> q_f;
    std::queue<uint64_t> q_b;
    
    std::unordered_map<uint64_t, uint64_t> parent_f;
    std::unordered_map<uint64_t, uint64_t> parent_b;
    
    q_f.push(start_packed);
    parent_f[start_packed] = 0;
    
    for (uint64_t target : target_states) {
        q_b.push(target);
        parent_b[target] = 0;
    }
    
    uint64_t collision_state = 0;
    bool found = false;
    
    while (!q_f.empty() && !q_b.empty()) {
        if (q_f.size() <= q_b.size()) {
            int level_size = q_f.size();
            for (int i = 0; i < level_size; ++i) {
                uint64_t curr = q_f.front();
                q_f.pop();
                nodes_explored++;
                
                if (parent_b.find(curr) != parent_b.end()) {
                    collision_state = curr;
                    found = true;
                    break;
                }
                
                int last_move = -1;
                uint64_t parent_info = parent_f[curr];
                if (curr != start_packed) {
                    last_move = parent_info >> 40;
                }
                int last_face = (last_move != -1) ? (last_move / 3) : -1;
                
                CubeState curr_state = CubeState::unpack(curr);
                for (int face = 0; face < 6; ++face) {
                    if (face == last_face) continue;
                    for (int type = 0; type < 3; ++type) {
                        int move = face * 3 + type;
                        CubeState next_state = apply_move(curr_state, face, type);
                        uint64_t next_packed = next_state.pack();
                        
                        if (parent_f.find(next_packed) == parent_f.end()) {
                            parent_f[next_packed] = curr | ((uint64_t)move << 40);
                            
                            // Check-on-push collision detection
                            if (parent_b.find(next_packed) != parent_b.end()) {
                                collision_state = next_packed;
                                found = true;
                                break;
                            }
                            q_f.push(next_packed);
                        }
                    }
                    if (found) break;
                }
                if (found) break;
            }
        } else {
            int level_size = q_b.size();
            for (int i = 0; i < level_size; ++i) {
                uint64_t curr = q_b.front();
                q_b.pop();
                nodes_explored++;
                
                if (parent_f.find(curr) != parent_f.end()) {
                    collision_state = curr;
                    found = true;
                    break;
                }
                
                int last_move = -1;
                uint64_t parent_info = parent_b[curr];
                
                // Root nodes in targets don't have parent_info move
                if (targets.find(curr) == targets.end()) {
                    last_move = parent_info >> 40;
                }
                int last_face = (last_move != -1) ? (last_move / 3) : -1;
                
                CubeState curr_state = CubeState::unpack(curr);
                for (int face = 0; face < 6; ++face) {
                    if (face == last_face) continue;
                    for (int type = 0; type < 3; ++type) {
                        int move = face * 3 + type;
                        CubeState next_state = apply_move(curr_state, face, type);
                        uint64_t next_packed = next_state.pack();
                        
                        if (parent_b.find(next_packed) == parent_b.end()) {
                            parent_b[next_packed] = curr | ((uint64_t)move << 40);
                            
                            // Check-on-push collision detection
                            if (parent_f.find(next_packed) != parent_f.end()) {
                                collision_state = next_packed;
                                found = true;
                                break;
                            }
                            q_b.push(next_packed);
                        }
                    }
                    if (found) break;
                }
                if (found) break;
            }
        }
        
        if (found) break;
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    
    if (found) {
        std::vector<std::string> path;
        
        // Reconstruct forward path (start -> collision)
        uint64_t curr = collision_state;
        while (curr != start_packed) {
            uint64_t info = parent_f[curr];
            uint64_t parent = info & 0xFFFFFFFFFFULL;
            int move = info >> 40;
            path.push_back(move_to_string(move / 3, move % 3));
            curr = parent;
        }
        std::reverse(path.begin(), path.end());
        
        // Reconstruct backward path (collision -> solved)
        curr = collision_state;
        while (targets.find(curr) == targets.end()) {
            uint64_t info = parent_b[curr];
            uint64_t parent = info & 0xFFFFFFFFFFULL;
            int move = info >> 40;
            int inv_move = get_inverse_move(move);
            path.push_back(move_to_string(inv_move / 3, inv_move % 3));
            curr = parent;
        }
        
        return {path, nodes_explored, elapsed, true, ""};
    }
    
    return {{}, nodes_explored, elapsed, false, "No solution found (unsolvable state)"};
}

// Helper to construct JSON response
std::string build_json_response(const std::string& status, const std::string& message, 
                                const std::vector<std::string>& moves, int nodes, double time_ms) {
    std::stringstream ss;
    ss << "{\"status\":\"" << status << "\",";
    ss << "\"message\":\"" << message << "\",";
    ss << "\"nodes_explored\":" << nodes << ",";
    ss << "\"time_ms\":" << time_ms << ",";
    ss << "\"moves\":[";
    for (size_t i = 0; i < moves.size(); ++i) {
        ss << "\"" << moves[i] << "\"";
        if (i + 1 < moves.size()) ss << ",";
    }
    ss << "]}";
    return ss.str();
}

// Converts CubeState back to a 24-character sticker string
std::string state_to_stickers(const CubeState& state) {
    char stickers[24];
    for (int i = 0; i < 24; ++i) stickers[i] = ' ';
    
    static const char face_to_char[] = {'W', 'Y', 'G', 'B', 'O', 'R'};
    
    for (int i = 0; i < 8; ++i) {
        int j = state.perm[i];
        int o = state.orient[i];
        const int* p = physical_pieces[j];
        const CornerStickers& s = corner_sticker_indices[i];
        
        int c1, c2, c3;
        if (o == 0) {
            c1 = p[0]; c2 = p[1]; c3 = p[2];
        } else if (o == 1) {
            c1 = p[2]; c2 = p[0]; c3 = p[1];
        } else { // o == 2
            c1 = p[1]; c2 = p[2]; c3 = p[0];
        }
        
        stickers[s.u_or_d_idx] = face_to_char[c1];
        stickers[s.f_or_b_idx] = face_to_char[c2];
        stickers[s.l_or_r_idx] = face_to_char[c3];
    }
    
    return std::string(stickers, 24);
}

// Main external interface
extern "C" {
EMSCRIPTEN_KEEPALIVE const char* solve_cube_wasm(const char* stickers_str_c, const char* algorithm_c) {
    static std::string result_cache;
    std::string stickers_str(stickers_str_c);
    std::string algorithm(algorithm_c);
    
    std::string error_msg;
    CubeState start_state;
    
    if (!validate_cube_state(stickers_str, error_msg, start_state)) {
        result_cache = build_json_response("error", error_msg, {}, 0, 0.0);
        return result_cache.c_str();
    }
    
    uint64_t start_packed = start_state.pack();
    const std::vector<uint64_t>& targets = get_cached_solved_states();
    
    SolveResult result;
    if (algorithm == "bfs") {
        result = solve_bfs(start_packed, targets);
    } else if (algorithm == "iddfs") {
        result = solve_iddfs(start_packed, targets);
    } else if (algorithm == "bidirectional") {
        result = solve_bidirectional_bfs(start_packed, targets);
    } else {
        result_cache = build_json_response("error", "Unknown solver algorithm", {}, 0, 0.0);
        return result_cache.c_str();
    }
    
    if (result.success) {
        result_cache = build_json_response("success", "Valid cube ✅", result.moves, result.nodes_explored, result.time_ms);
    } else {
        std::string err = result.error_message.empty() ? "No solution found (unsolvable state)" : result.error_message;
        result_cache = build_json_response("error", err, {}, result.nodes_explored, result.time_ms);
    }
    
    return result_cache.c_str();
}

EMSCRIPTEN_KEEPALIVE const char* apply_move_wasm(const char* stickers_str_c, const char* move_c) {
    static std::string result_cache;
    std::string stickers_str(stickers_str_c);
    std::string move(move_c);
    
    std::string error_msg;
    CubeState state;
    if (!validate_cube_state(stickers_str, error_msg, state)) {
        result_cache = stickers_str;
        return result_cache.c_str();
    }
    
    if (move.length() < 1) {
        result_cache = stickers_str;
        return result_cache.c_str();
    }
    
    char f_char = move[0];
    int face = -1;
    switch (f_char) {
        case 'U': face = 0; break;
        case 'D': face = 1; break;
        case 'F': face = 2; break;
        case 'B': face = 3; break;
        case 'L': face = 4; break;
        case 'R': face = 5; break;
    }
    
    if (face == -1) {
        result_cache = stickers_str;
        return result_cache.c_str();
    }
    
    int type = 0; // CW
    if (move.find("'") != std::string::npos) type = 1; // CCW
    else if (move.find("2") != std::string::npos) type = 2; // Double
    
    CubeState next_state = apply_move(state, face, type);
    result_cache = state_to_stickers(next_state);
    return result_cache.c_str();
}
}
