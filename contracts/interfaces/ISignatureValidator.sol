// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

contract ISignatureValidatorConstants {
  // bytes4(keccak256("isValidSignature(bytes,bytes)")
  bytes4 internal constant EIP1271_MAGIC_VALUE = 0x20c13b0b;
}

abstract contract ISignatureValidator is ISignatureValidatorConstants {
  /**
   * @notice Legacy EIP1271 method to validate a signature.
   * @param _data Arbitrary length data signed on the behalf of address(this).
   * @param _signature Signature byte array associated with _data.
   *
   * MUST return the bytes4 magic value 0x20c13b0b when function passes.
   * MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
   * MUST allow external calls
   */
  function isValidSignature(
    bytes memory _data,
    bytes memory _signature
  ) public view virtual returns (bytes4);
}
