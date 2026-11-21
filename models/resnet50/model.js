// ResNet-50 — He et al., "Deep Residual Learning for Image Recognition" (2015).
export default {
  id: 'resnet50',
  name: 'ResNet-50',
  short: 'ResNet-50',
  year: 2015,
  org: 'Microsoft Research',
  family: 'CNN',
  task: 'Image classification',
  params: '25.6M params',
  tags: ['supervised', 'ImageNet-1k'],
  buildsOn: [],
  tagline: 'Skip connections make very deep networks trainable. Each block learns only a small correction to its input instead of a whole new representation.',
  paper: { title: 'Deep Residual Learning for Image Recognition', url: 'https://arxiv.org/abs/1512.03385' },
  code: 'https://github.com/pytorch/vision/blob/main/torchvision/models/resnet.py',
  facts: [
    { value: '50', label: 'weighted layers' },
    { value: '4.1 GFLOPs', label: 'per 224² image' },
    { value: '76.1 → 80.9%', label: 'ImageNet top-1 (original → modern recipe)' },
    { value: '427 px', label: 'theoretical receptive field' },
  ],

  takeaways: [
    'Why plain deep networks get <b>worse</b> as you add layers (the degradation problem), and how an identity <b>skip connection</b> fixes it.',
    'How the <b>bottleneck block</b> (1×1 → 3×3 → 1×1) makes depth affordable.',
    'The classic CNN pattern: <b>halve the resolution, double the channels</b>. Features move from edges to textures to parts to objects as the receptive field grows.',
    'Why <b>BatchNorm + He initialisation</b> keep activations and gradients in a healthy range.',
    'How to reuse ResNet features: which stage to tap for which task, and pitfalls such as BatchNorm with small batches.',
  ],

  sections: [
    {
      type: 'architecture',
      intro: 'ResNet-50 is a stem, then four stages of bottleneck blocks (3, 4, 6 and 3 blocks), then a classifier. Each stage halves the spatial size and doubles the width, so the boxes get <i>shorter</i> and <i>wider</i>. Press play to follow a 224×224 image through the network.',
      stages: [
        { name: 'Input', kind: 'io', shape: [224, 224, 3], summary: 'An RGB image, resized and normalised with the ImageNet mean and std.', learns: 'nothing yet: raw pixel intensities.' },
        { name: 'Stem conv', kind: 'conv', shape: [112, 112, 64], ops: ['7×7 conv, 64, stride 2', 'BatchNorm', 'ReLU'], summary: 'A single large convolution that quickly cuts the resolution in half. Its 64 filters cover a 7×7 neighbourhood.', learns: 'oriented edges, colour blobs and opponent colours, much like Gabor filters. You can see this directly by plotting the conv1 weights.' },
        { name: 'Max pool', kind: 'norm', shape: [56, 56, 64], ops: ['3×3 max pool, stride 2'], summary: 'Keeps the strongest response in each 3×3 window, halving the resolution again. Most of the compute now runs at 56×56 instead of 224×224.', learns: 'no weights. It adds a little translation invariance.' },
        { name: 'conv2_x', kind: 'conv', shape: [56, 56, 256], repeat: 3, skip: true, ops: ['1×1 conv, 64  (reduce)', '3×3 conv, 64', '1×1 conv, 256 (expand)', '+ BN & ReLU after each'], summary: 'Three bottleneck blocks. The output is <code>ReLU(F(x) + x)</code>: the convolutions only learn the <i>residual</i> F. The first block uses a 1×1 projection on the shortcut to match the 256 channels.', learns: 'combinations of edges: corners, junctions, simple textures and colour patterns. Receptive field ≈ 35 px.' },
        { name: 'conv3_x', kind: 'conv', shape: [28, 28, 512], repeat: 4, skip: true, ops: ['1×1 conv, 128', '3×3 conv, 128, stride 2*', '1×1 conv, 512'], summary: 'Four blocks. The first downsamples with stride 2 and uses a projection shortcut (1×1 conv, stride 2). *torchvision puts the stride on the 3×3 conv ("ResNet v1.5"); the paper put it on the first 1×1.', learns: 'repeated patterns and textures such as brick, fur, mesh and grass. Receptive field ≈ 91 px.' },
        { name: 'conv4_x', kind: 'conv', shape: [14, 14, 1024], repeat: 6, skip: true, ops: ['1×1 conv, 256', '3×3 conv, 256', '1×1 conv, 1024'], summary: 'The deepest stage, with six blocks. Detection and segmentation models often tap this level (C4) because it balances semantics and resolution.', learns: 'object parts such as wheels, eyes, windows and leaves. Receptive field ≈ 267 px, larger than the image.' },
        { name: 'conv5_x', kind: 'conv', shape: [7, 7, 2048], repeat: 3, skip: true, ops: ['1×1 conv, 512', '3×3 conv, 512', '1×1 conv, 2048'], summary: 'Three blocks at 7×7. Each of the 49 positions carries a 2048-d descriptor.', learns: 'whole objects and class-specific evidence. Grad-CAM heat maps are usually computed here.' },
        { name: 'Global avg pool', kind: 'norm', shape: [1, 1, 2048], summary: 'Averages each channel over the 7×7 grid. This replaces the huge fully-connected layers of VGG and makes the network work at any input size.', learns: 'no weights. It produces a single image embedding, the vector people extract as "ResNet features".' },
        { name: 'FC + softmax', kind: 'head', shape: [1, 1, 1000], label: '1000 classes', ops: ['Linear 2048 → 1000', 'softmax'], summary: 'A linear classifier turns the embedding into 1000 logits, and softmax turns those into probabilities.', learns: 'one weight vector per class (a "template" in feature space).' },
      ],
      caption: 'Box height ∝ log(resolution), width ∝ log(channels). ×n = number of stacked blocks.',
    },
    {
      type: 'features',
      intro: 'As depth grows, each unit sees more of the image (the receptive field grows) and encodes more abstract concepts. Pick a stage to see the kind of feature maps it produces.',
      stages: [
        { label: 'Input', view: 'input' },
        { label: 'Stem', view: 'edges', res: 112, caption: 'Signed responses of oriented edge and colour-opponent filters. Blue means negative and red means positive. Like the real conv1, these are local and generic.' },
        { label: 'conv2', view: 'textures', res: 56, caption: 'Edge responses get combined and pooled into texture and corner detectors. Busy leaves and grass light up differently from smooth sky.' },
        { label: 'conv3', view: 'textures', res: 28, caption: 'Coarser and more invariant texture channels. Bricks are detected as "brick-ness" regardless of exact position.' },
        { label: 'conv4', view: 'parts', res: 14, caption: 'Units respond to object parts: windows, a triangular roof, vertical posts, foliage. Zeiler & Fergus found this pattern by visualising real units.' },
        { label: 'conv5', view: 'objects', res: 7, caption: 'At 7×7, channels act like whole-object detectors. Global average pooling then asks one question per channel: how much house-ness is in the image?' },
      ],
    },
    {
      type: 'losses',
      intro: 'ResNet is trained with plain supervised learning: softmax cross-entropy on ImageNet labels, plus weight decay.',
      items: [
        {
          name: 'Softmax cross-entropy',
          formula: '<i>p<sub>k</sub></i> = e<sup><i>z<sub>k</sub></i></sup> / Σ<sub><i>j</i></sub> e<sup><i>z<sub>j</sub></i></sup><span class="op">,</span>&nbsp;&nbsp; ℒ<sub>CE</sub> = −log <i>p<sub>y</sub></i>',
          terms: [['z<sub>k</sub>', 'logit for class k (FC output)'], ['y', 'the true class'], ['p<sub>y</sub>', 'predicted probability of the true class']],
          explain: 'The loss is near zero when the model is confident and right, and it grows sharply as the probability of the correct class falls. The gradient for each logit is simply <i>p<sub>k</sub></i> − 𝟙[<i>k</i>=<i>y</i>], which pushes the true class up and the others down in proportion to how wrong they are.',
          widget: { name: 'cross-entropy', props: { classes: ['house', 'tree', 'car', 'dog', 'boat'] } },
        },
        {
          name: 'Weight decay (L2)',
          weight: 'λ = 1e-4',
          formula: 'ℒ = ℒ<sub>CE</sub> + <i>λ</i> ‖<i>θ</i>‖²<sub>2</sub>',
          explain: 'A small penalty on weight magnitude acts as a regulariser. In networks with BatchNorm it mostly controls the <i>effective learning rate</i>, because BN makes a conv layer\'s output invariant to the scale of its weights.',
        },
      ],
    },
    {
      type: 'techniques',
      items: [
        {
          name: 'Residual (skip) connections',
          tag: 'core idea',
          what: 'Each block outputs <code>x + F(x)</code> instead of <code>F(x)</code>. When the shapes change, the shortcut is a 1×1 strided projection.',
          why: 'Learning "no change" becomes trivial (F = 0), so extra layers can\'t hurt. During backprop the identity path carries gradients straight to early layers without repeated shrinking. A 56-layer plain net had <i>higher training error</i> than a 20-layer one; residual nets kept improving up to 152 layers.',
          apply: 'Wrap any stack of layers that keeps the shape the same in a residual. Initialise the last layer of F (or the last BN γ) to zero so each block starts as identity ("zero-init residual"); this often gives a free +0.2–0.5%. It works the same way in MLPs, transformers and U-Nets.',
          widget: { name: 'residual-gradient' },
        },
        {
          name: 'Bottleneck blocks',
          what: 'A 1×1 conv shrinks 256 channels to 64, a 3×3 conv runs on the thin tensor, and a 1×1 conv expands back to 256.',
          why: 'The expensive spatial 3×3 conv runs on 4× fewer channels. That makes a 50-layer network cost about the same FLOPs as a 34-layer one built from basic blocks, while being more accurate.',
          apply: 'Use 1×1 convs as cheap channel mixers to reduce width before costly ops. The same idea shows up as the transformer MLP (expand → contract) and as MobileNet\'s inverted bottleneck.',
          widget: { name: 'bar-chart', props: { title: 'Weights in one block at 256 channels', unit: 'k params', items: [{ label: 'Two 3×3 convs (256→256)', value: 1180 }, { label: 'Bottleneck 1×1·3×3·1×1', value: 70, highlight: true }] } },
        },
        {
          name: 'BatchNorm + He initialisation',
          what: 'Each conv is followed by BatchNorm, which normalises every channel over the batch and then applies a learned scale and shift. Weights are initialised with variance 2/fan-in ("He init") to suit ReLU.',
          why: 'Activations stay at a stable scale through 50+ layers, so you can train with a large learning rate (0.1) from the start. Without it, signals explode or vanish exponentially with depth.',
          apply: 'For small per-GPU batches (detection, segmentation, under ~8 images), BN statistics get noisy. Freeze BN (eval mode) or switch to GroupNorm or LayerNorm. Before deploying, fold BN into the previous conv for free speed.',
          widget: { name: 'batchnorm' },
        },
        {
          name: 'Growing receptive field',
          what: 'Stacking 3×3 convs with periodic stride 2 grows each unit\'s receptive field from 7 px to 427 px.',
          why: 'Large receptive fields let the last stages respond to whole objects and their context. The <i>effective</i> receptive field is much smaller and Gaussian-shaped, because central pixels contribute far more than the edges.',
          apply: 'Check that your receptive field covers the objects you care about. Dilated convs, bigger kernels or attention enlarge it without losing resolution. For small objects, tap earlier, higher-resolution stages (as FPN does).',
          widget: { name: 'receptive-field', props: { stages: [{ name: 'stem', rf: 7 }, { name: 'pool', rf: 11 }, { name: 'conv2', rf: 35 }, { name: 'conv3', rf: 91 }, { name: 'conv4', rf: 267 }, { name: 'conv5', rf: 427 }], input: 224 } },
        },
      ],
    },
    {
      type: 'tips',
      intro: 'ResNet-50 is still the default baseline and backbone in many papers. Here is how to get the most out of it.',
      items: [
        { title: 'Use modern weights', body: 'torchvision\'s <code>IMAGENET1K_V2</code> weights reach 80.9% top-1 (vs 76.1% originally) with the same architecture, just better training: longer schedules, mixup and cutmix, label smoothing, EMA. Transfer improves too.' },
        { title: 'Pick the right stage', body: 'Use the pooled 2048-d embedding for retrieval and classification. Use C4 (14×14) or C5 (7×7) for coarse localisation such as CAMs. Detection and segmentation use all of C2–C5 through an FPN.' },
        { title: 'Fine-tuning recipe', body: 'Replace <code>fc</code>. Train the head first with the backbone frozen, then unfreeze with a 10× smaller LR for the backbone. SGD with momentum 0.9 or AdamW both work. For tiny datasets, unfreeze only conv5.' },
        { title: 'BatchNorm pitfalls', body: 'With batch sizes under about 16, keep BN in eval mode (frozen statistics) or replace it with GroupNorm. When you change input statistics (medical images, thermal), recompute BN statistics on the new data even if you freeze the weights.' },
      ],
    },
    {
      type: 'references',
      items: [
        { label: 'He et al., Deep Residual Learning for Image Recognition (2015)', url: 'https://arxiv.org/abs/1512.03385' },
        { label: 'Ioffe & Szegedy, Batch Normalization (2015)', url: 'https://arxiv.org/abs/1502.03167' },
        { label: 'Zeiler & Fergus, Visualizing and Understanding CNNs (2013)', url: 'https://arxiv.org/abs/1311.2901', note: 'what each layer learns' },
        { label: 'Luo et al., Understanding the Effective Receptive Field (2016)', url: 'https://arxiv.org/abs/1701.04128' },
        { label: 'Wightman et al., ResNet strikes back (2021)', url: 'https://arxiv.org/abs/2110.00476', note: 'modern training recipe' },
      ],
    },
  ],
};
