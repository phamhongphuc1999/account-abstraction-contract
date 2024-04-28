#! /bin/bash

Green='\033[0;32m'
NC='\033[0m'

printf "${Green}Step 1: Update${NC}\n"
apt -y update && apt -y upgrade

printf "${Green}Step 2: Install sudo${NC}\n"
apt -y install sudo
sudo --version

printf "${Green}Step 3: Re-udpate${NC}\n"
sudo apt update && sudo apt upgrade

printf "${Green}Step 4: Install make${NC}\n"
sudo apt-get -y install make
make --version

printf "${Green}Step 5: Install some useful plugins${NC}\n"
sudo apt -y install curl wget git

printf "${Green}Step 6: Install node environment${NC}\n"
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.39.0/install.sh | bash
source ~/.profile
nvm install v21.7.3
node --version
npm --version
npm install -g yarn

printf "${Green}Step 7: Install circom${NC}\n"
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

printf "${Green}Step 8: Install snarkjs${NC}\n"
npm install -g snarkjs
