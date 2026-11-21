// Vision Transformer — Dosovitskiy et al., "An Image is Worth 16x16 Words" (2020).
export default {
  id: 'vit',
  name: 'Vision Transformer (ViT-B/16)',
  short: 'ViT',
  year: 2020,
  org: 'Google Research',
  family: 'Transformer',
  task: 'Image classification',
  params: '86M params',
  tags: ['supervised', 'JFT / ImageNet-21k pretraining'],
  buildsOn: ['resnet50'],
  tagline: 'Treat an image as a sequence of 16×16 patches and run a standard Transformer on it. With enough data, global self-attention beats the built-in priors of convolutions.',
  paper: { title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale', url: 'https://arxiv.org/abs/2010.11929' },
  code: 'https://github.com/google-research/vision_transformer',
  facts: [
    { value: '197', label: 'tokens (196 patches + CLS)' },
    { value: '12 × 768', label: 'layers × width, 12 heads' },
    { value: '17.6 GFLOPs', label: 'per 224² image' },
    { value: '88.6%', label: 'ImageNet top-1 (ViT-H/14, JFT-300M)' },
  ],

  takeaways: [
    'How <b>patch embedding</b> turns an image into tokens, and why patch size trades detail against quadratic compute.',
    'What <b>self-attention</b> computes, and why every layer has a <i>global</i> receptive field.',
    'How <b>position embeddings</b> and the <b>[CLS] token</b> work, and how to change input resolution after training.',
    'Why ViTs need <b>large datasets or strong augmentation</b>: they have weak inductive bias compared with CNNs.',
    'How attention moves from <b>local to global</b> with depth, and what the final tokens encode.',
  ],

  sections: [
    {
      type: 'architecture',
      intro: 'After the patch embedding, nothing changes shape: 197 tokens of width 768 flow through 12 identical blocks. Compare this with ResNet\'s shrinking pyramid. This "isotropic" design is why the boxes are all the same size.',
      stages: [
        { name: 'Input', kind: 'io', shape: [224, 224, 3], summary: 'An RGB image, typically 224×224 for pretraining and 384×384 for fine-tuning.', learns: '—' },
        { name: 'Patch embed', kind: 'norm', shape: [14, 14, 768], tokens: true, ops: ['split into 16×16 patches', 'flatten: 16·16·3 = 768 values', 'Linear 768 → 768'], summary: 'Equivalent to a 16×16 convolution with stride 16. Each patch becomes one token. This is the <i>only</i> place where the model sees raw pixels.', learns: 'a basis of patch filters (edges, colour gradients, frequency patterns) similar to the first conv layer of a CNN.', widget: { name: 'patchify', props: { initial: 16 } } },
        { name: '+ [CLS] & pos-emb', kind: 'norm', shape: [14, 14, 768], tokens: true, label: '197×768', ops: ['prepend learnable [CLS] token', 'add learned position embedding (197×768)'], summary: 'Attention is permutation-invariant, so position must be injected explicitly. The extra [CLS] token has no image content. It gathers information from all patches and is read out for classification.', learns: 'a 2-D layout: similar embeddings for nearby patches and for the same row or column.' },
        { name: 'Transformer block', kind: 'attn', shape: [14, 14, 768], tokens: true, label: '197×768', repeat: 12, skip: '⊕ two residuals: around attention and around the MLP', ops: ['LayerNorm', 'Multi-head self-attention (12 heads × 64)', '⊕ residual', 'LayerNorm', 'MLP 768 → 3072 → 768, GELU', '⊕ residual'], summary: 'Pre-norm Transformer encoder. In attention every token compares itself with every other token, so the receptive field is the whole image from layer 1. The MLP then processes each token independently.', learns: 'early layers mix both local and global context. Some heads already attend far away. Later layers group tokens by object and semantics.' },
        { name: 'LayerNorm', kind: 'norm', shape: [14, 14, 768], tokens: true, label: '197×768', summary: 'A final normalisation of all tokens.', learns: '—' },
        { name: '[CLS] → head', kind: 'head', shape: [1, 1, 1000], label: '1000 classes', ops: ['take token 0 ([CLS])', 'Linear 768 → classes'], summary: 'Only the [CLS] output is classified. Mean-pooling the patch tokens works as well and is common in later models. During pretraining the head is an MLP; for fine-tuning it is replaced by a zero-initialised linear layer.', learns: 'class templates in token space.' },
      ],
      caption: 'All transformer stages share one shape (197 tokens × 768). The resolution never drops, unlike in a CNN.',
    },
    {
      type: 'features',
      intro: 'Tap or drag on a patch to make it the query and see where it attends. Early layers mostly look nearby. With depth, attention follows <i>semantics</i>: a wall patch attends to the whole house.',
      note: 'Illustrative attention computed from toy patch features. Real heads vary: in ViT some early heads are already global, but mean attention distance grows with depth (Dosovitskiy et al., Fig. 7).',
      stages: [
        { label: 'Input', view: 'input' },
        { label: 'Layer 1', view: 'attention', depth: 0.05, caption: 'Attention is mostly local and positional. The token blends with its neighbours, similar to a small conv kernel but with weights that depend on the content.' },
        { label: 'Layer 6', view: 'attention', depth: 0.45, caption: 'A mix of local and content-based attention. Tokens start to group with others of the same material or part.' },
        { label: 'Layer 12', view: 'attention', depth: 1, caption: 'Semantic attention. Tokens attend to every patch of the same object, wherever it is. The receptive field is truly global.' },
        { label: 'Token PCA', view: 'pca', caption: 'Projecting final token features onto 3 principal components shows object and part groupings. Supervised ViTs show this weakly; self-supervised ones such as DINO show it strongly.' },
      ],
    },
    {
      type: 'widget',
      id: 'attention',
      title: 'Self-attention, step by step',
      nav: 'Attention',
      intro: 'Each token produces a query <i>q</i>, a key <i>k</i> and a value <i>v</i>. Attention weights are softmax(<i>q·k</i>/√<i>d</i>), and the output is the weighted sum of values. Multi-head attention runs 12 of these in parallel on 64-dimensional slices.',
      widget: { name: 'attention-matrix' },
    },
    {
      type: 'losses',
      intro: 'ViT is trained with standard supervised classification. Its quality comes from <i>scale</i>: pretraining on JFT-300M or ImageNet-21k, then fine-tuning.',
      items: [
        {
          name: 'Cross-entropy on the [CLS] token',
          formula: 'ℒ = −log softmax(<i>W</i> · LN(<i>z</i><sub>L</sub><sup>0</sup>))<sub><i>y</i></sub>',
          terms: [['z<sub>L</sub><sup>0</sup>', 'the [CLS] token after the last layer'], ['W', 'linear classification head']],
          explain: 'The same softmax cross-entropy as in ResNet, applied to one token. JFT pretraining is multi-label and used a sigmoid cross-entropy per class. DeiT showed that ViT-B can reach 81.8% on ImageNet-1k alone with heavy augmentation and regularisation.',
          widget: { name: 'cross-entropy', props: { classes: ['house', 'barn', 'church', 'tree', 'dog'] } },
        },
      ],
    },
    {
      type: 'techniques',
      items: [
        {
          name: 'Patch embedding (tokenisation)',
          tag: 'core idea',
          what: 'A strided P×P conv turns the image into (H/P)·(W/P) tokens of width D.',
          why: 'It makes the sequence short enough for global attention: 196 tokens instead of 50k pixels. Bigger patches are cheaper; smaller patches keep detail (ViT-B/32 vs /16 vs /8).',
          apply: 'Any 2-D or 3-D signal can be patchified: spectrograms, video (tubelets), point-cloud voxels, satellite tiles. Choose P so that the token count fits your attention budget. Cost grows ∝ tokens².',
          widget: { name: 'patchify', props: { initial: 16 } },
        },
        {
          name: 'Position embeddings',
          what: 'A learned vector per patch position is added to each token.',
          why: 'Without it, attention treats the image as an unordered bag of patches. The model learns 2-D structure on its own.',
          apply: 'To fine-tune at a higher resolution, <b>bicubically interpolate</b> the position-embedding grid (e.g. 14×14 → 24×24). This standard trick gives +1–3% accuracy. For variable resolutions, consider relative schemes such as RoPE (used in DINOv3 and SAM 3).',
          widget: { name: 'position-embedding', props: { mode: 'learned', both: true } },
        },
        {
          name: 'The [CLS] token',
          what: 'An extra learnable token that holds no image content. It attends to all patches and serves as the image summary.',
          why: 'It gives the network a dedicated "global" slot, separate from the patch tokens that keep local information.',
          apply: 'For dense tasks, use the patch tokens. For retrieval and classification, use [CLS], the mean of the patch tokens, or both concatenated (as DINOv3 does for linear probes).',
        },
        {
          name: 'Scale beats inductive bias',
          what: 'ViT drops convolution\'s locality and translation equivariance and learns them from data instead.',
          why: 'On ImageNet-1k alone, ViT underperforms ResNets. With 14M–300M images, it overtakes them and keeps scaling.',
          apply: 'On small datasets, start from pretrained ViT weights (DINOv3, CLIP, MAE, or IN-21k "augreg" checkpoints). If you must train from scratch, use strong augmentation (RandAugment, mixup, cutmix), stochastic depth and long schedules (the DeiT recipe), or a hybrid conv stem.',
          widget: { name: 'bar-chart', props: { title: 'ImageNet top-1 after pretraining on… (ViT-L/16, paper Table 5 / Fig. 3, approx.)', unit: '%', decimals: 1, max: 90, items: [{ label: 'ImageNet-1k (1.3M)', value: 76.5 }, { label: 'ImageNet-21k (14M)', value: 85.3 }, { label: 'JFT-300M (300M)', value: 87.8, highlight: true }] } },
        },
      ],
    },
    {
      type: 'tips',
      items: [
        { title: 'Layer-wise LR decay', body: 'When fine-tuning, give earlier blocks smaller learning rates (e.g. ×0.65–0.75 per block). Early blocks hold generic features that you want to keep.' },
        { title: 'Higher resolution at fine-tune', body: 'Fine-tune at 384² with interpolated position embeddings. Tokens grow 196 → 576 and so does accuracy. Memory grows ∝ tokens², so use gradient checkpointing or FlashAttention.' },
        { title: 'Use patch tokens for dense tasks', body: 'Reshape the 196 output tokens back to 14×14×768 for segmentation or detection heads. ViTDet and ViT-Adapter build simple feature pyramids from this single scale.' },
        { title: 'Regularise', body: 'AdamW with high weight decay (0.05–0.3), stochastic depth 0.1–0.2, warmup, and gradient clipping at 1.0 are standard. Training ViTs from scratch without warmup is unstable.' },
      ],
    },
    {
      type: 'references',
      items: [
        { label: 'Dosovitskiy et al., An Image is Worth 16x16 Words (2020)', url: 'https://arxiv.org/abs/2010.11929' },
        { label: 'Vaswani et al., Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762' },
        { label: 'Touvron et al., DeiT: Training data-efficient image transformers (2020)', url: 'https://arxiv.org/abs/2012.12877' },
        { label: 'Steiner et al., How to train your ViT? (2021)', url: 'https://arxiv.org/abs/2106.10270', note: 'augmentation and regularisation study' },
        { label: 'Raghu et al., Do Vision Transformers See Like CNNs? (2021)', url: 'https://arxiv.org/abs/2108.08810' },
      ],
    },
  ],
};
