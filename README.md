### Account Abstraction

My Account <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Spider.png" alt="Spider" width="25" height="25" /> abstraction is strongly influenced by [eth-infinitism](https://github.com/eth-infinitism/account-abstraction/tree/develop)

### Usage <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fly.png" alt="Fly" width="25" height="25" />

- To install dependencies

```shell
yarn install
```

- Create your environment

```shell
cp .env_example .env
```

- To <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Fly.png" alt="Fly" width="25" height="25" /> compile contracts

```shell
yarn rmCompile
```

- to test

```shell
yarn test
```

## Circom usage <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Lady%20Beetle.png" alt="Lady Beetle" width="25" height="25" />

I use docker for configing and running circom. If you cause segment fault error on build docker's process, you should change node version, v21.7.3 fit for me.

- Start docker

```shell
docker compose up -d
```

- Exe to docker container

```shell
docker exec -it aa-contract /bin/bash
```

- Setup

```shell
cd workspaces/circom
chmod +x ./shells/setup.sh
source ./shells/setup.sh
```

- Try to compile and generate proof, you can follow command line written in `Makefile`.

#### Step 1: compile <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Jellyfish.png" alt="Jellyfish" width="25" height="25" /> circom

```shell
make compile name=circom-file-name
```

#### Step 2: compute witness

```shell
make witness name=circom-file-name
```

#### Step 3: <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Deer.png" alt="Deer" width="25" height="25" /> provide power

```shell
make power power=power name=circom-file-name
```

You can select enough power by this [link](https://github.com/iden3/snarkjs)

#### Step 4: generate proof

```shell
make proof name=circom-file-name
```

#### Step 5<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Jellyfish.png" alt="Jellyfish" width="25" height="25" />: try to verify your proof

```shell
make verify
```
