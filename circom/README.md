# My circom

## Circom usage <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Lady%20Beetle.png" alt="Lady Beetle" width="25" height="25" />

- I use devcontainer to create and run docker environment. After running docker container, you must follow the instruction in [this file](./shells/setup.sh). If you cause segment fault error on build docker's process, you should change node version, v21.7.3 fit for me.

- Start docker

```shell
you must follow the devcontainer to restart docker container
```

- Setup

```shell
chmod +x ./shells/setup.sh
source ./shells/setup.sh
```

- Try to compile and generate proof, you can follow command line written in `Makefile`.

#### Step 1: compile <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Jellyfish.png" alt="Jellyfish" width="25" height="25" /> circom

```shell
make compile name=circom-file-name
```

The output must be similar:

```shell
circom jubjub.circom --r1cs --wasm
template instances: 104
non-linear constraints: 17158
linear constraints: 726
public inputs: 0
private inputs: 848 (844 belong to witness)
public outputs: 2
wires: 18711
labels: 47765
Written successfully: ./jubjub.r1cs
Written successfully: ./jubjub_js/jubjub.wasm
Everything went okay
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

#### If you want to generate smart contract, you can follow this command

```shell
make solidity name=circom-file-name
```

## Run circom test

```shell
make circom_test name=poseidon
```
