# 🧩 2×2 Rubik's Cube Solver & Validator

A high-performance web application that validates and solves any valid **2×2 Rubik's Cube** configuration using a **C++17 solver compiled to WebAssembly (WASM)** with an interactive **React + Three.js** frontend.

> ⚡ Computes optimal solutions within milliseconds while providing an intuitive 3D visualization and step-by-step playback.

---

## 🚀 Demo

> **Live Demo:** _Add your deployed website link here_

> **Video Demo:** _Add your demo video/GIF here_

---

## ✨ Features

- ✅ Interactive 3D Rubik's Cube
- ✅ Manual cube painting
- ✅ Random scramble generator
- ✅ Instant cube validation
- ✅ Detects impossible cube configurations
- ✅ Optimal shortest-path solving
- ✅ Step-by-step solution playback
- ✅ Move counter
- ✅ Execution time measurement
- ✅ Nodes explored statistics
- ✅ Multiple solving algorithms

---

## 🛠️ Tech Stack

### Frontend

- React 19
- Tailwind CSS
- Three.js
- Vite

### Backend Logic

- C++17
- WebAssembly (Emscripten)

---

# 📂 Project Structure

```text
.
├── src/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── wasm/
│   └── App.jsx
│
├── wasm/
│   ├── solver.cpp
│   ├── build.sh
│   └── test_solver.cpp
│
├── public/
└── README.md
```

---

# ⚙️ How It Works

```
User Input
      │
      ▼
React Frontend
      │
      ▼
WebAssembly Bridge
      │
      ▼
C++ Solver
      │
      ├── Validate Cube
      │
      └── Solve Cube
              │
              ▼
Solution + Statistics
              │
              ▼
Three.js Animation
```

---

# 🧠 Solver Highlights

The solving engine is implemented completely in **C++17** and compiled to **WebAssembly** for near-native browser performance.

### Validation

Before solving, the cube is checked for:

- Correct color distribution
- Valid corner permutation
- Valid corner orientation
- Physically solvable cube state

Invalid configurations are rejected instantly.

---

### Supported Algorithms

- 🔹 Bidirectional BFS
- 🔹 Breadth First Search (BFS)
- 🔹 Iterative Deepening DFS (IDDFS)

The solver returns the shortest possible solution while reporting:

- Execution Time
- Nodes Explored
- Number of Moves

---

# 📊 Performance

| Metric | Result |
|---------|---------|
| Language | C++17 |
| Runtime | ~1–5 ms (Bidirectional BFS) |
| Memory Efficient | ✅ |
| Optimal Solution | ✅ |
| Runs in Browser | ✅ |

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

```bash
cd YOUR_REPOSITORY
```

---

## Install Dependencies

```bash
npm install
```

---

## Start Development Server

```bash
npm run dev
```

Visit

```
http://localhost:5173
```

---

# 🔧 Rebuild WebAssembly

Whenever you modify the C++ solver:

```bash
./wasm/build.sh
```

This recompiles the solver to WebAssembly.

---

# 🧪 Run C++ Tests

```bash
g++ -O3 -std=c++17 wasm/solver.cpp wasm/test_solver.cpp -o wasm/test_runner

./wasm/test_runner
```

---

# 📸 Screenshots

Add screenshots here.

Example:

```
assets/home.png

assets/solver.png

assets/animation.png
```

---

# 🎯 Resume Highlights

- Built a production-ready Rubik's Cube solver using **C++17 + WebAssembly**
- Integrated native C++ algorithms with a modern React frontend
- Implemented multiple graph-search algorithms including Bidirectional BFS, BFS, and IDDFS
- Developed an interactive Three.js visualization with real-time solution playback
- Added robust cube validation for physically impossible configurations
- Achieved millisecond-level solving performance inside the browser

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

If you'd like to improve the project, feel free to fork the repository and submit a pull request.

---

# 📄 License

This project is licensed under the MIT License.