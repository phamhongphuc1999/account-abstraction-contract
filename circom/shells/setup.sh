#! /bin/bash

Green='\033[0;32m'
NC='\033[0m'

printf "${Green}Step 1: Install node environment${NC}\n"
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.39.0/install.sh | bash
source ~/.profile
nvm install v21.7.3
node --version
npm --version
npm install -g yarn

printf "${Green}Step 2: Install circom${NC}\n"
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
sudo apt -y install build-essential
chmod +x $HOME/.cargo/env
$HOME/.cargo/env
cd ./circom
git clone https://github.com/iden3/circom.git
cd ./circom
cargo build --release
cargo install --path circom
cd ../../

printf "${Green}Step 3: Install snarkjs${NC}\n"
npm install -g snarkjs
