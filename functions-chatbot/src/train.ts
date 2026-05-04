import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';

import intentsData from './intents.json';
import { buildVocab, vectorize } from './preprocess';

type Intent = { tag: string; patterns: string[]; responses: string[] };

async function saveModelToDir(model: tf.LayersModel, outDir: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const handler = tf.io.withSaveHandler(async (artifacts) => {
    const weightData = artifacts.weightData as ArrayBuffer;
    fs.writeFileSync(
      path.join(outDir, 'weights.bin'),
      Buffer.from(weightData),
    );
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest: [
        {
          paths: ['weights.bin'],
          weights: artifacts.weightSpecs,
        },
      ],
    };
    fs.writeFileSync(
      path.join(outDir, 'model.json'),
      JSON.stringify(modelJson),
    );
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON',
      },
    };
  });
  await model.save(handler);
}

async function main() {
  const intents = intentsData.intents as Intent[];
  const trainable = intents.filter((i) => i.patterns.length > 0);

  const allPatterns = trainable.flatMap((i) => i.patterns);
  const vocab = buildVocab(allPatterns);
  const intentTags = trainable.map((i) => i.tag);

  const xs: number[][] = [];
  const ys: number[][] = [];
  trainable.forEach((intent, idx) => {
    for (const p of intent.patterns) {
      xs.push(vectorize(p, vocab));
      const oneHot = new Array(intentTags.length).fill(0);
      oneHot[idx] = 1;
      ys.push(oneHot);
    }
  });

  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [vocab.length],
      units: 16,
      activation: 'relu',
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(
    tf.layers.dense({ units: intentTags.length, activation: 'softmax' }),
  );

  model.compile({
    optimizer: tf.train.adam(0.005),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  const xTensor = tf.tensor2d(xs);
  const yTensor = tf.tensor2d(ys);

  await model.fit(xTensor, yTensor, {
    epochs: 200,
    batchSize: 8,
    shuffle: true,
    verbose: 1,
  });

  xTensor.dispose();
  yTensor.dispose();

  const outDir = path.join(__dirname, '..', 'model');
  await saveModelToDir(model, outDir);

  fs.writeFileSync(
    path.join(outDir, 'vocab.json'),
    JSON.stringify(
      {
        vocab,
        intents: intentTags,
        threshold:
          (intentsData as { threshold?: number }).threshold ?? 0.45,
      },
      null,
      2,
    ),
  );

  console.log(
    `Trained. vocab=${vocab.length}, intents=${intentTags.length}, samples=${xs.length}`,
  );
}

main().catch((err) => {
  console.error('Training failed:', err);
  process.exit(1);
});
