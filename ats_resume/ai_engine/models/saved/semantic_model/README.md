---
tags:
- sentence-transformers
- sentence-similarity
- feature-extraction
- generated_from_trainer
- dataset_size:8819
- loss:CosineSimilarityLoss
base_model: sentence-transformers/all-MiniLM-L6-v2
widget:
- source_sentence: The man talked to a girl over the internet camera.
  sentences:
  - A group of elderly people pose around a dining table.
  - A teenager talks to a girl over a webcam.
  - There is no 'still' that is not relative to some other object.
- source_sentence: A woman is writing something.
  sentences:
  - Two eagles are perched on a branch.
  - It refers to the maximum f-stop (which is defined as the ratio of focal length
    to effective aperture diameter).
  - A woman is chopping green onions.
- source_sentence: The player shoots the winning points.
  sentences:
  - Minimum wage laws hurt the least skilled, least productive the most.
  - The basketball player is about to score points for his team.
  - Sheep are grazing in the field in front of a line of trees.
- source_sentence: Stars form in star-formation regions, which itself develop from
    molecular clouds.
  sentences:
  - Although I believe Searle is mistaken, I don't think you have found the problem.
  - It may be possible for a solar system like ours to exist outside of a galaxy.
  - A blond-haired child performing on the trumpet in front of a house while his younger
    brother watches.
- source_sentence: While Queen may refer to both Queen regent (sovereign) or Queen
    consort, the King has always been the sovereign.
  sentences:
  - At first, I thought this is a bit of a tricky question.
  - A man sitting on the floor in a room is strumming a guitar.
  - There is a very good reason not to refer to the Queen's spouse as "King" - because
    they aren't the King.
pipeline_tag: sentence-similarity
library_name: sentence-transformers
metrics:
- pearson_cosine
- spearman_cosine
model-index:
- name: SentenceTransformer based on sentence-transformers/all-MiniLM-L6-v2
  results:
  - task:
      type: semantic-similarity
      name: Semantic Similarity
    dataset:
      name: sts test BEFORE
      type: sts-test-BEFORE
    metrics:
    - type: pearson_cosine
      value: 0.8274064201566584
      name: Pearson Cosine
    - type: spearman_cosine
      value: 0.8203247283076371
      name: Spearman Cosine
  - task:
      type: semantic-similarity
      name: Semantic Similarity
    dataset:
      name: sts val
      type: sts-val
    metrics:
    - type: pearson_cosine
      value: 0.8946949906002798
      name: Pearson Cosine
    - type: spearman_cosine
      value: 0.8944165862022849
      name: Spearman Cosine
---

# SentenceTransformer based on sentence-transformers/all-MiniLM-L6-v2

This is a [sentence-transformers](https://www.SBERT.net) model finetuned from [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). It maps sentences & paragraphs to a 384-dimensional dense vector space and can be used for retrieval.

## Model Details

### Model Description
- **Model Type:** Sentence Transformer
- **Base model:** [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) <!-- at revision c9745ed1d9f207416be6d2e6f8de32d1f16199bf -->
- **Maximum Sequence Length:** 256 tokens
- **Output Dimensionality:** 384 dimensions
- **Similarity Function:** Cosine Similarity
- **Supported Modality:** Text
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Sentence Transformers on Hugging Face](https://huggingface.co/models?library=sentence-transformers)

### Full Model Architecture

```
SentenceTransformer(
  (0): Transformer({'transformer_task': 'feature-extraction', 'modality_config': {'text': {'method': 'forward', 'method_output_name': 'last_hidden_state'}}, 'module_output_name': 'token_embeddings', 'architecture': 'BertModel'})
  (1): Pooling({'embedding_dimension': 384, 'pooling_mode': 'mean', 'include_prompt': True})
  (2): Normalize({})
)
```

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```
Then you can load this model and run inference.
```python
from sentence_transformers import SentenceTransformer

# Download from the 🤗 Hub
model = SentenceTransformer("sentence_transformers_model_id")
# Run inference
sentences = [
    'While Queen may refer to both Queen regent (sovereign) or Queen consort, the King has always been the sovereign.',
    'There is a very good reason not to refer to the Queen\'s spouse as "King" - because they aren\'t the King.',
    'A man sitting on the floor in a room is strumming a guitar.',
]
embeddings = model.encode(sentences)
print(embeddings.shape)
# [3, 384]

# Get the similarity scores for the embeddings
similarities = model.similarity(embeddings, embeddings)
print(similarities)
# tensor([[ 1.0000,  0.4159, -0.0042],
#         [ 0.4159,  1.0000,  0.0211],
#         [-0.0042,  0.0211,  1.0000]])
```
<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

## Evaluation

### Metrics

#### Semantic Similarity

* Datasets: `sts-test-BEFORE` and `sts-val`
* Evaluated with [<code>EmbeddingSimilarityEvaluator</code>](https://sbert.net/docs/package_reference/sentence_transformer/evaluation.html#sentence_transformers.sentence_transformer.evaluation.EmbeddingSimilarityEvaluator)

| Metric              | sts-test-BEFORE | sts-val    |
|:--------------------|:----------------|:-----------|
| pearson_cosine      | 0.8274          | 0.8947     |
| **spearman_cosine** | **0.8203**      | **0.8944** |

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Dataset

#### Unnamed Dataset

* Size: 8,819 training samples
* Columns: <code>sentence1</code>, <code>sentence2</code>, and <code>score</code>
* Approximate statistics based on the first 100 samples:
  |          | sentence1                                                                         | sentence2                                                                         | score                                                          |
  |:---------|:----------------------------------------------------------------------------------|:----------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type     | string                                                                            | string                                                                            | float                                                          |
  | modality | text                                                                              | text                                                                              |                                                                |
  | details  | <ul><li>min: 3 tokens</li><li>mean: 10.39 tokens</li><li>max: 35 tokens</li></ul> | <ul><li>min: 3 tokens</li><li>mean: 10.41 tokens</li><li>max: 49 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.58</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence1                                   | sentence2                                | score             |
  |:--------------------------------------------|:-----------------------------------------|:------------------|
  | <code>IT</code>                             | <code>PRJM</code>                        | <code>0.72</code> |
  | <code>A man and a woman are smiling.</code> | <code>A man and a woman laughing.</code> | <code>0.64</code> |
  | <code>MRKT</code>                           | <code>PRDM</code>                        | <code>0.72</code> |
* Loss: [<code>CosineSimilarityLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#cosinesimilarityloss) with these parameters:
  ```json
  {
      "loss_fct": "torch.nn.modules.loss.MSELoss",
      "cos_score_transformation": "torch.nn.modules.linear.Identity"
  }
  ```

### Evaluation Dataset

#### Unnamed Dataset

* Size: 1,500 evaluation samples
* Columns: <code>sentence1</code>, <code>sentence2</code>, and <code>score</code>
* Approximate statistics based on the first 100 samples:
  |          | sentence1                                                                         | sentence2                                                                        | score                                                          |
  |:---------|:----------------------------------------------------------------------------------|:---------------------------------------------------------------------------------|:---------------------------------------------------------------|
  | type     | string                                                                            | string                                                                           | float                                                          |
  | modality | text                                                                              | text                                                                             |                                                                |
  | details  | <ul><li>min: 7 tokens</li><li>mean: 10.04 tokens</li><li>max: 20 tokens</li></ul> | <ul><li>min: 7 tokens</li><li>mean: 9.96 tokens</li><li>max: 18 tokens</li></ul> | <ul><li>min: 0.0</li><li>mean: 0.53</li><li>max: 1.0</li></ul> |
* Samples:
  | sentence1                                         | sentence2                                             | score             |
  |:--------------------------------------------------|:------------------------------------------------------|:------------------|
  | <code>A man with a hard hat is dancing.</code>    | <code>A man wearing a hard hat is dancing.</code>     | <code>1.0</code>  |
  | <code>A young child is riding a horse.</code>     | <code>A child is riding a horse.</code>               | <code>0.95</code> |
  | <code>A man is feeding a mouse to a snake.</code> | <code>The man is feeding a mouse to the snake.</code> | <code>1.0</code>  |
* Loss: [<code>CosineSimilarityLoss</code>](https://sbert.net/docs/package_reference/sentence_transformer/losses.html#cosinesimilarityloss) with these parameters:
  ```json
  {
      "loss_fct": "torch.nn.modules.loss.MSELoss",
      "cos_score_transformation": "torch.nn.modules.linear.Identity"
  }
  ```

### Training Hyperparameters
#### Non-Default Hyperparameters

- `per_device_train_batch_size`: 32
- `num_train_epochs`: 4
- `warmup_steps`: 110
- `batch_sampler`: no_duplicates

#### All Hyperparameters
<details><summary>Click to expand</summary>

- `per_device_train_batch_size`: 32
- `num_train_epochs`: 4
- `max_steps`: -1
- `learning_rate`: 5e-05
- `lr_scheduler_type`: linear
- `lr_scheduler_kwargs`: None
- `warmup_steps`: 110
- `optim`: adamw_torch_fused
- `optim_args`: None
- `weight_decay`: 0.0
- `adam_beta1`: 0.9
- `adam_beta2`: 0.999
- `adam_epsilon`: 1e-08
- `optim_target_modules`: None
- `gradient_accumulation_steps`: 1
- `average_tokens_across_devices`: True
- `max_grad_norm`: 1.0
- `label_smoothing_factor`: 0.0
- `bf16`: False
- `fp16`: False
- `bf16_full_eval`: False
- `fp16_full_eval`: False
- `tf32`: None
- `gradient_checkpointing`: False
- `gradient_checkpointing_kwargs`: None
- `torch_compile`: False
- `torch_compile_backend`: None
- `torch_compile_mode`: None
- `use_liger_kernel`: False
- `liger_kernel_config`: None
- `use_cache`: False
- `neftune_noise_alpha`: None
- `torch_empty_cache_steps`: None
- `auto_find_batch_size`: False
- `log_on_each_node`: True
- `logging_nan_inf_filter`: True
- `include_num_input_tokens_seen`: no
- `log_level`: passive
- `log_level_replica`: warning
- `disable_tqdm`: False
- `project`: huggingface
- `trackio_space_id`: None
- `trackio_bucket_id`: None
- `trackio_static_space_id`: None
- `per_device_eval_batch_size`: 8
- `prediction_loss_only`: True
- `eval_on_start`: False
- `eval_do_concat_batches`: True
- `eval_use_gather_object`: False
- `eval_accumulation_steps`: None
- `include_for_metrics`: []
- `batch_eval_metrics`: False
- `save_only_model`: False
- `save_on_each_node`: False
- `enable_jit_checkpoint`: False
- `push_to_hub`: False
- `hub_private_repo`: None
- `hub_model_id`: None
- `hub_strategy`: every_save
- `hub_always_push`: False
- `hub_revision`: None
- `load_best_model_at_end`: False
- `ignore_data_skip`: False
- `restore_callback_states_from_checkpoint`: False
- `full_determinism`: False
- `seed`: 42
- `data_seed`: None
- `use_cpu`: False
- `accelerator_config`: {'split_batches': False, 'dispatch_batches': None, 'even_batches': True, 'use_seedable_sampler': True, 'non_blocking': False, 'gradient_accumulation_kwargs': None}
- `parallelism_config`: None
- `dataloader_drop_last`: False
- `dataloader_num_workers`: 0
- `dataloader_pin_memory`: True
- `dataloader_persistent_workers`: False
- `dataloader_prefetch_factor`: None
- `remove_unused_columns`: True
- `label_names`: None
- `train_sampling_strategy`: random
- `length_column_name`: length
- `ddp_find_unused_parameters`: None
- `ddp_bucket_cap_mb`: None
- `ddp_broadcast_buffers`: False
- `ddp_static_graph`: None
- `ddp_backend`: None
- `ddp_timeout`: 1800
- `fsdp`: []
- `fsdp_config`: {'min_num_params': 0, 'xla': False, 'xla_fsdp_v2': False, 'xla_fsdp_grad_ckpt': False}
- `deepspeed`: None
- `debug`: []
- `skip_memory_metrics`: True
- `do_predict`: False
- `resume_from_checkpoint`: None
- `warmup_ratio`: None
- `local_rank`: -1
- `prompts`: None
- `batch_sampler`: no_duplicates
- `multi_dataset_batch_sampler`: proportional
- `router_mapping`: {}
- `learning_rate_mapping`: {}

</details>

### Training Logs
| Epoch  | Step | Training Loss | Validation Loss | sts-test-BEFORE_spearman_cosine | sts-val_spearman_cosine |
|:------:|:----:|:-------------:|:---------------:|:-------------------------------:|:-----------------------:|
| -1     | -1   | -             | -               | 0.8203                          | -                       |
| 0.1812 | 50   | 0.0397        | -               | -                               | -                       |
| 0.3623 | 100  | 0.0202        | 0.0213          | -                               | 0.8884                  |
| 0.5435 | 150  | 0.0189        | -               | -                               | -                       |
| 0.7246 | 200  | 0.0181        | 0.0210          | -                               | 0.8946                  |
| 0.9058 | 250  | 0.0101        | -               | -                               | -                       |
| 1.0870 | 300  | 0.0064        | 0.0219          | -                               | 0.8931                  |
| 1.2681 | 350  | 0.0117        | -               | -                               | -                       |
| 1.4493 | 400  | 0.0111        | 0.0204          | -                               | 0.8942                  |
| 1.6304 | 450  | 0.0115        | -               | -                               | -                       |
| 1.8116 | 500  | 0.0114        | 0.0216          | -                               | 0.8940                  |
| 1.9928 | 550  | 0.0017        | -               | -                               | -                       |
| 2.1739 | 600  | 0.0068        | 0.0207          | -                               | 0.8956                  |
| 2.3551 | 650  | 0.0074        | -               | -                               | -                       |
| 2.5362 | 700  | 0.0082        | 0.0209          | -                               | 0.8951                  |
| 2.7174 | 750  | 0.0079        | -               | -                               | -                       |
| 2.8986 | 800  | 0.0050        | 0.0206          | -                               | 0.8956                  |
| 3.0797 | 850  | 0.0030        | -               | -                               | -                       |
| 3.2609 | 900  | 0.0057        | 0.0207          | -                               | 0.8941                  |
| 3.4420 | 950  | 0.0059        | -               | -                               | -                       |
| 3.6232 | 1000 | 0.0064        | 0.0208          | -                               | 0.8942                  |
| 3.8043 | 1050 | 0.0062        | -               | -                               | -                       |
| 3.9855 | 1100 | 0.0008        | 0.0209          | -                               | 0.8944                  |
| 4.0    | 1104 | -             | 0.0209          | -                               | 0.8944                  |


### Training Time
- **Training**: 3.6 minutes
- **Evaluation**: 1.4 minutes
- **Total**: 5.0 minutes

### Framework Versions
- Python: 3.14.4
- Sentence Transformers: 5.5.0
- Transformers: 5.8.1
- PyTorch: 2.12.0
- Accelerate: 1.13.0
- Datasets: 4.8.5
- Tokenizers: 0.22.2

## Citation

### BibTeX

#### Sentence Transformers
```bibtex
@inproceedings{reimers-2019-sentence-bert,
    title = "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    author = "Reimers, Nils and Gurevych, Iryna",
    booktitle = "Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing",
    month = "11",
    year = "2019",
    publisher = "Association for Computational Linguistics",
    url = "https://arxiv.org/abs/1908.10084",
}
```

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->