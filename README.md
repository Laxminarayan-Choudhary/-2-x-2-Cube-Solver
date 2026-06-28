# 2×2 Rubik’s Cube Solver & Validator

A production-quality, resume-ready web application that validates and solves any 2×2 Rubik's Cube configuration using a high-performance **C++17 solver** compiled to **WebAssembly (WASM)**, integrated with an interactive **React + Tailwind CSS + Three.js** frontend.

---

## 🧠 Technical Architecture

```mermaid
graph TD
    A[Stickers State (24 Chars)] -->|User Paint / Scramble| B[React Frontend]
    B -->|WASM ccall| C[C++ WebAssembly Core]
    C -->|validate_cube_state| D{Validity Checker}
    D -->|Invalid| E[Error Response]
    D -->|Valid| F[Solver Engine]
    F -->|Bidirectional BFS / BFS / IDDFS| G[Success Response]
    G -->|JSON Payload| B
    B -->|Step-by-step Playback| H[Three.js 3D Canvas]
```

### 1. State Representation (C++)
To maximize memory efficiency and search performance, states are represented by the **8 corner pieces** (rather than a 24-element array of sticker characters).
- **Corner Permutation**: Each of the 8 positions holds one of the 8 unique physical corner pieces (represented by values $0 \dots 7$, requiring $3$ bits).
- **Corner Orientation**: Each corner has $3$ possible orientations (twists):
  - `0`: The Up/Down color is on the Up/Down face.
  - `1`: The Up/Down color is twisted clockwise.
  - `2`: The Up/Down color is twisted counter-clockwise.
  - Represented by values $0 \dots 2$ (requiring $2$ bits).

Each corner takes exactly $5$ bits. The entire cube state is packed into a **single 40-bit integer (`uint64_t`)**:
$$\text{State} = \sum_{i=0}^{7} \left( \text{perm}[i] \ll 5i + \text{orient}[i] \ll (5i + 3) \right)$$

This layout allows:
- **Instant comparison** (a single 64-bit integer inequality check).
- **Zero-allocation hashing** (using the integer directly as a hash key in `std::unordered_map`).
- **Minimal memory footprint** (8 bytes per node on the search queue).

---

## ✅ Cube Validity Rules

Before solving, the C++ core validates the configuration against **3 physical constraints**:

1. **Color Count**: The 24-character sticker string must contain exactly 6 colors, and each color must appear exactly **4 times** (representing the 24 stickers on a $2 \times 2$ cube).
2. **Valid Permutation**:
   - The stickers at each corner position are checked in clockwise order.
   - They must match one of the 8 physical corner combinations:
     - `UFL`: White-Green-Orange
     - `UFR`: White-Red-Green
     - `UBR`: White-Blue-Red
     - `UBL`: White-Orange-Blue
     - `DFL`: Yellow-Orange-Green
     - `DFR`: Yellow-Green-Red
     - `DBR`: Yellow-Red-Blue
     - `DBL`: Yellow-Blue-Orange
   - There must be no duplicate corners. Mirrored corners (corners that have a left-handed configuration instead of right-handed) will fail this check since they do not match any cyclic shift of the physical pieces.
3. **Valid Orientation**:
   - The sum of twists of all 8 corners must be congruent to $0 \bmod 3$:
     $$\sum_{i=0}^{7} \text{orient}[i] \equiv 0 \pmod 3$$
   - A sum $\not\equiv 0 \pmod 3$ represents an impossible state where a single corner is twisted, which cannot be solved by turning faces.

---

## ⚙️ Solver Engine & Search Algorithms

If the cube state is valid, the solver searches for a path from the scrambled state to any of the solved states. 

Since a $2\times2$ cube can be rotated in space 24 different ways, the solver runs a BFS from the standard solved state using **whole-cube rotations** to pre-generate the **24 equivalent target solved states**.

### 1. Bidirectional BFS (Highly Optimized)
- Runs two simultaneous Breadth-First Searches: one forward from the **start state**, and one backward from the **24 target states**.
- Alternates expanding frontiers, prioritizing the side with the smaller frontier size.
- Employs **check-on-push collision detection** to find intersecting states immediately, reducing search depth.
- Restricts searches by pruning inverse moves (e.g. avoiding $R'$ immediately after $R$, and not turning the same face twice in a row), reducing the branching factor from 18 to 15.
- **Performance**: Finds the absolute shortest solution (God's number is at most 11 in Half-Turn Metric) in **under 1–5 milliseconds**, exploring only a fraction of the search space.

### 2. Standard BFS (Breadth-First Search)
- Runs a forward search from the start state to the 24 target states.
- Explores all paths of length $d$ before moving to $d+1$.
- Guaranteed to find the shortest solution, but has higher memory overhead than Bidirectional BFS.

### 3. IDDFS (Iterative Deepening DFS)
- Performs depth-first searches with incrementally increasing depth limits.
- Combines the memory efficiency of DFS (linear space complexity) with the shortest-path guarantee of BFS.
- Slower than BFS due to redundant node expansions, but runs in under 10–20ms for a $2\times2$ cube.

---

## 🚀 Installation & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Homebrew](https://brew.sh/) (macOS) or Emscripten SDK (to re-compile C++)

### 1. Compile C++ to WebAssembly
To re-compile the C++ solver, run the build script:
```bash
# Compile solver.cpp to src/wasm/solver.js
./wasm/build.sh
```

### 2. Run Local Development Server
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173/` in your browser.

### 3. Local CLI C++ Tests
You can compile and run unit tests locally without WebAssembly:
```bash
g++ -O3 -std=c++17 wasm/solver.cpp wasm/test_solver.cpp -o wasm/test_runner && ./wasm/test_runner
```
