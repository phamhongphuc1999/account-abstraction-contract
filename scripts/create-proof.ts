import { generateCalldata, generateProof, verifyProof } from '../test/poseidon-utils';

async function main() {
  const account = '0x871DBcE2b9923A35716e7E83ee402B535298538E';
  const { proof, publicSignals } = await generateProof(account);
  const res = await verifyProof(proof, publicSignals);
  if (res === true) {
    console.log('Verification OK');
    const _call = await generateCalldata(proof, publicSignals);
    console.log('🚀 ~ main ~ _call:', JSON.parse(`[${_call}]`));
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
