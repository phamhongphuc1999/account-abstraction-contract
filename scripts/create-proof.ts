import {
  convertStringToUint8,
  generateCalldata,
  generateProof,
  verifyProof,
} from '../test/jubjub-util';

async function main() {
  const _privateKey = convertStringToUint8(
    'fc0a5f8f953abdc85301347c264cdbec92ace822a197499492316b337e8684b5'
  );
  const { proof, publicSignals } = await generateProof('00540000000000362701', _privateKey);
  const res = await verifyProof(proof, publicSignals);
  if (res === true) {
    console.log('Verification OK');
    const { pA, pB, pC, pubSignals } = await generateCalldata(proof, publicSignals);
    console.log('🚀 ~ main ~ _call:', pA, pB, pC, pubSignals);
  } else {
    console.log('Invalid proof');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  });
