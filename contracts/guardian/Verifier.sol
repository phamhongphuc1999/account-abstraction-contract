// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Verifier {
  // Scalar field size
  uint256 constant r =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;
  // Base field size
  uint256 constant q =
    21888242871839275222246405745257275088696311157297823662689037894645226208583;

  // Verification Key data
  uint256 constant alphax =
    20903055778564014827330918788022045845460481770381112745986114726558297372226;
  uint256 constant alphay =
    10494822381211922697598743636792121435107202625562129530241729304455589395243;
  uint256 constant betax1 =
    11696105404482363816512246875554589159616726193086087532370662633393599848765;
  uint256 constant betax2 =
    1559499049654330267737706400233876696608302350967361047939005830665573109228;
  uint256 constant betay1 =
    1061845736071566680999567019089464404564579294696974039442219051013209315812;
  uint256 constant betay2 =
    12097927371267297258793197589771387845149103020761807837230959952184171506851;
  uint256 constant gammax1 =
    11559732032986387107991004021392285783925812861821192530917403151452391805634;
  uint256 constant gammax2 =
    10857046999023057135944570762232829481370756359578518086990519993285655852781;
  uint256 constant gammay1 =
    4082367875863433681332203403145435568316851327593401208105741076214120093531;
  uint256 constant gammay2 =
    8495653923123431417604973247489272438418190587263600148770280649306958101930;
  uint256 constant deltax1 =
    63269028974373041263217791025173038416312692954606747312498615910838898403;
  uint256 constant deltax2 =
    12998377606005803109402017490739503661165516856102357632170448504039412974615;
  uint256 constant deltay1 =
    18663898806870893173679483765093935951781139962617276751685467385941262584444;
  uint256 constant deltay2 =
    12102795127564104662981041891175455361599623469316967447196241364552178792050;

  uint256 constant IC0x =
    11820180297317542145777891674930081235686234121589113019313714209300597866053;
  uint256 constant IC0y =
    10304626621453593465487572988977086389720519254426968065230618343673180073307;

  uint256 constant IC1x =
    20224907248386281876517253575936636360285158247800295568191682785744565544973;
  uint256 constant IC1y =
    6176400148086239116857438951904873861851951246824994695305916064595523010195;

  uint256 constant IC2x =
    6424712886590678328823283351230892314420191815325295961536806992299829235213;
  uint256 constant IC2y =
    8871623224000774105883181179343218537881673690706251850914267643472712079279;

  uint256 constant IC3x =
    18385430713650317218009281575124472327609185487758396769108734026574084823648;
  uint256 constant IC3y =
    11383398438053929399923110900680262931556401786528950342875169738666458787874;

  // Memory data
  uint16 constant pVk = 0;
  uint16 constant pPairing = 128;

  uint16 constant pLastMem = 896;

  function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[3] calldata _pubSignals
  ) public view returns (bool isValid) {
    assembly {
      function checkField(v) {
        if iszero(lt(v, r)) {
          mstore(0, 0)
          return(0, 0x20)
        }
      }

      // G1 function to multiply a G1 value(x,y) to value in an address
      function g1_mulAccC(pR, x, y, s) {
        let success
        let mIn := mload(0x40)
        mstore(mIn, x)
        mstore(add(mIn, 32), y)
        mstore(add(mIn, 64), s)

        success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

        if iszero(success) {
          mstore(0, 0)
          return(0, 0x20)
        }

        mstore(add(mIn, 64), mload(pR))
        mstore(add(mIn, 96), mload(add(pR, 32)))

        success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

        if iszero(success) {
          mstore(0, 0)
          return(0, 0x20)
        }
      }

      function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
        let _pPairing := add(pMem, pPairing)
        let _pVk := add(pMem, pVk)

        mstore(_pVk, IC0x)
        mstore(add(_pVk, 32), IC0y)

        // Compute the linear combination vk_x

        g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))

        g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))

        g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))

        // -A
        mstore(_pPairing, calldataload(pA))
        mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

        // B
        mstore(add(_pPairing, 64), calldataload(pB))
        mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
        mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
        mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

        // alpha1
        mstore(add(_pPairing, 192), alphax)
        mstore(add(_pPairing, 224), alphay)

        // beta2
        mstore(add(_pPairing, 256), betax1)
        mstore(add(_pPairing, 288), betax2)
        mstore(add(_pPairing, 320), betay1)
        mstore(add(_pPairing, 352), betay2)

        // vk_x
        mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
        mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

        // gamma2
        mstore(add(_pPairing, 448), gammax1)
        mstore(add(_pPairing, 480), gammax2)
        mstore(add(_pPairing, 512), gammay1)
        mstore(add(_pPairing, 544), gammay2)

        // C
        mstore(add(_pPairing, 576), calldataload(pC))
        mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

        // delta2
        mstore(add(_pPairing, 640), deltax1)
        mstore(add(_pPairing, 672), deltax2)
        mstore(add(_pPairing, 704), deltay1)
        mstore(add(_pPairing, 736), deltay2)

        let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

        isOk := and(success, mload(_pPairing))
      }

      let pMem := mload(0x40)
      mstore(0x40, add(pMem, pLastMem))

      // Validate that all evaluations ∈ F

      checkField(calldataload(add(_pubSignals, 0)))

      checkField(calldataload(add(_pubSignals, 32)))

      checkField(calldataload(add(_pubSignals, 64)))

      checkField(calldataload(add(_pubSignals, 96)))

      // Validate all evaluations
      //       // mstore(0, isValid)
      //       // return(0, 0x20)
      isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)
    }
  }
}
