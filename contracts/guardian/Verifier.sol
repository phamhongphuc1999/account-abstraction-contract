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
    8015915628604946692118953749933854905640366132063990584519070764510442054262;
  uint256 constant alphay =
    17204929335728701552743508554995279653369951805317050118400519451847347995296;
  uint256 constant betax1 =
    13674356436825026753491667109991687186870078859386595581275194627869768480237;
  uint256 constant betax2 =
    3954285195171976646177587007396665579972495349082930888857402577174723295868;
  uint256 constant betay1 =
    4030820088046883267493586053614642337054156353841500648810495065981534675283;
  uint256 constant betay2 =
    12525438481176791339658566168107252492718913461397511043929895905263996115526;
  uint256 constant gammax1 =
    11559732032986387107991004021392285783925812861821192530917403151452391805634;
  uint256 constant gammax2 =
    10857046999023057135944570762232829481370756359578518086990519993285655852781;
  uint256 constant gammay1 =
    4082367875863433681332203403145435568316851327593401208105741076214120093531;
  uint256 constant gammay2 =
    8495653923123431417604973247489272438418190587263600148770280649306958101930;
  uint256 constant deltax1 =
    9907025479734505467680593110554107356269992015903416477669759660414257227909;
  uint256 constant deltax2 =
    11250405002719837897882195293698351851965812700259756390794399210850018427602;
  uint256 constant deltay1 =
    10650662072706225651903682596575154607951174680662555966246010869805791503888;
  uint256 constant deltay2 =
    21346031356682269472861558161271589627907062133142067307526203039183610953705;

  uint256 constant IC0x =
    19860967140492360949404038293533858852530567725713185930392019668695887959249;
  uint256 constant IC0y =
    21461729945942212281853552807888690033699363026558845671653388004111697506362;

  uint256 constant IC1x =
    9653265884355024489514153501932939579776039955570794014866706274484241214562;
  uint256 constant IC1y =
    19918397100033780534418992797046355096518712021567799362962658776267471300120;

  uint256 constant IC2x =
    8442585167468205926007937118039952647456076760305291037473870048480177742528;
  uint256 constant IC2y =
    12869032535530771318187120199392630675037319500966856148765077700523193013486;

  // Memory data
  uint16 constant pVk = 0;
  uint16 constant pPairing = 128;

  uint16 constant pLastMem = 896;

  function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[2] calldata _pubSignals
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

      // Validate all evaluations
      // mstore(0, isValid)
      // return(0, 0x20)
      isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)
    }
  }
}
