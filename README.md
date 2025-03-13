# Installation

```
xcode-select --install
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
bun i
```

# Running

```
bun run tauri dev
```

# Weird errors?

```
rustup update
cargo update
```

# Clean and rebuild

```
cargo clean
cargo build
```

# How to release

Change `tauri.conf.json` version, then push then merge to releases branch.
