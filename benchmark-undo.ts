// benchmark-undo.ts
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function simulateSequentialDeletion(numDocs: number) {
    const start = performance.now();
    for (let i = 0; i < numDocs; i++) {
        // Simulating 50ms network roundtrip per deletion
        await delay(50);
    }
    const end = performance.now();
    return end - start;
}

async function simulateConcurrentDeletion(numDocs: number) {
    const start = performance.now();
    const promises = [];
    for (let i = 0; i < numDocs; i++) {
        // Simulating 50ms network roundtrip per deletion
        promises.push(delay(50));
    }
    await Promise.all(promises);
    const end = performance.now();
    return end - start;
}

async function run() {
    const NUM_DOCS = 10;

    console.log(`Running benchmark with ${NUM_DOCS} docs to delete...`);

    // Warmup
    await simulateSequentialDeletion(1);
    await simulateConcurrentDeletion(1);

    const seqTime = await simulateSequentialDeletion(NUM_DOCS);
    console.log(`Sequential deletion: ${seqTime.toFixed(2)} ms`);

    const concTime = await simulateConcurrentDeletion(NUM_DOCS);
    console.log(`Concurrent deletion: ${concTime.toFixed(2)} ms`);

    const improvement = seqTime / concTime;
    console.log(`Improvement: ${improvement.toFixed(2)}x faster`);
}

run();