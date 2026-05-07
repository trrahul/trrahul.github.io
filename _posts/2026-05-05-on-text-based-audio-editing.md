---
layout: post
title: On text-based audio editing
date: 2025-04-14 17:11:05 +05:30
categories: [Design]
tags: []
---

## Overview and workflow

A text-based audio editor transcribes the audio, lets the user edit the transcript (delete words, rephrase sentences, insert new words), and reconstructs the audio to reflect those changes. It works well for spoken-word content like audiobooks, audiodramas, and podcasts, where word-level precision matters. The pieces involved:

- Speech transcription (ASR): produces an editable transcript of the audio.
- Audio-text alignment: ties transcript words to timestamps in the original audio so text edits map to specific audio segments.
- Voice cloning / neural TTS: generates new audio for inserted or modified text in the original speaker's voice.
- Audio reconstruction: splices the original and synthesised segments together.

The sections below cover each piece, with references to existing tools and implementations.

---

## Speech transcription engines (ASR)

Transcription is the foundation. The transcript is the user's editing surface, so accuracy matters more than anywhere else in the pipeline. Two broad options: local models that run on your own hardware, and cloud APIs.

Local models, open source. [OpenAI Whisper](https://github.com/openai/whisper) is the obvious starting point. It runs offline, works in many languages, and produces transcripts with segment timestamps (and word-level timing with extra tooling). It is free to run but needs a GPU for reasonable speed on long files. Other options include Kaldi-derived models (Vosk) and Coqui STT, though Whisper's English accuracy is generally ahead of them. Whisper is also available as a hosted API.

Cloud APIs. Deepgram, OpenAI's Whisper API, Microsoft Azure Speech, Google Cloud Speech-to-Text, AssemblyAI, Rev AI, Speechmatics, Amazon Transcribe, and IBM Watson all offer speech-to-text. Most return word timestamps and confidence scores; many add diarisation, punctuation and casing, and analytics on top. AssemblyAI emphasises diarisation and pay-as-you-go pricing. Deepgram targets real-time streaming. Pricing varies; published rates are roughly $0.004/min for Deepgram and $0.006/min for OpenAI's Whisper API ([reference comparison](https://levelup.gitconnected.com/the-speech-to-text-guide-4-platforms-transforming-workflows-0eff9ef0d951)). [Deepgram's own list](https://deepgram.com/learn/best-speech-to-text-apis) of competing services is also a useful overview.

Choosing one comes down to: accuracy on the audio you actually have (audiobook narration is easier than casual podcast speech), cost, whether the audio can leave the building, and whether you need real-time. Whisper is a reasonable default if local hardware is fine; AssemblyAI or Deepgram simplify integration and tend to handle dialects and noisy recordings better.

A short comparison of the common options:

- OpenAI Whisper (open-source, local or hosted API): runs locally so audio stays on the device, but needs a GPU for speed. Hosted API around $0.006/min.
- AssemblyAI (cloud API): word-level timestamps, diarisation, filler-word detection. Pay-as-you-go.
- Deepgram (cloud API or on-prem): streaming and batch, custom model training, around $0.004/min on the public price list. Can run on-prem.
- Google Cloud Speech-to-Text (cloud API): automatic punctuation and casing, diarisation, multi-channel.
- Microsoft Azure Speech (cloud API): Custom Speech for domain vocabulary, diarisation, batch and real-time.
- Amazon Transcribe (cloud API): custom vocabulary, speaker identification, specialised models like Medical Transcribe.

Cloud APIs are easier to integrate but send audio off-site. Local models keep audio private at the cost of running and updating the model yourself. Some apps mix both: local for short clips, cloud for longer files or harder audio.

---

## Audio-text alignment (forced alignment)

Alignment is what links each word in the transcript to its timing in the audio. The editor needs that mapping so a deletion in the transcript becomes the right cut in the waveform. Many ASR engines hand back word timing already, but a separate alignment pass is often needed after manual transcript corrections, or when an existing script has to be aligned to an existing recording.

[Forced alignment](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html) takes an audio file and its transcript and finds where each word (or phoneme) sits in the audio. Tools made for this produce precise word boundaries even on long files like audiobooks.

The common ones for English:

- [Montreal Forced Aligner (MFA)](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html). Open source, built on Kaldi, supports English and many other languages with pretrained acoustic models. Outputs word- and phoneme-level timestamps in formats like Praat TextGrid. Accurate when the transcript matches the audio. Command-line, runs a constrained ASR pass under the hood, so it is not fast.
- [Gentle](https://github.com/lowerquality/gentle). Open source, also Kaldi-based, designed to tolerate small mismatches between transcript and audio (skipped words, paraphrasing). Returns per-word confidence so misaligned words are visible. Used in early Descript and various podcast pipelines.
- [Aeneas](https://www.readbeyond.it/aeneas/). Python/C library for sentence- or paragraph-level alignment, often used to sync audiobooks against ebook text. Uses MFCC analysis and heuristics, or can call out to ASR.

ASR output can also serve as alignment when the initial transcript is trusted. Whisper returns segment and per-word timing; Google and Deepgram return per-word start and end. Once the user corrects the transcript, running a forced aligner keeps the corrected text tied to the original audio.

Alignment tools assume the transcript is verbatim. After heavy edits (reorderings, replacements), only the unchanged spans align; new synthesised audio covers the rest. For pure deletions, accurate timings allow surgical cuts that do not clip neighbouring words.

---

## Voice cloning and neural TTS

When the user adds or changes words, the system has to generate audio for those words in the same voice as the original speaker. This is voice cloning: neural TTS that [matches the original speaker's voice and style](https://medium.com/@iamananth123/real-time-voice-cloning-a-deep-dive-into-revolutionary-tts-technologies-ce34c9911078).

The main approaches:

- Multi-speaker TTS with speaker embeddings (SV2TTS). A speaker encoder turns a few seconds of the target's audio into an embedding, a synthesiser (Tacotron 2, FastSpeech) generates a spectrogram from text conditioned on that embedding, and a vocoder (HiFi-GAN) turns the spectrogram into audio. This enables zero-shot cloning from short samples (claims of as little as 5 seconds in the literature). [Real-Time Voice Cloning by Corentin Jemine](https://github.com/CorentinJ/Real-Time-Voice-Cloning) is the reference open-source implementation. Output quality scales with sample length.
- Voice fine-tuning. Fine-tune a pretrained TTS model on recordings of the target speaker. Microsoft's Custom Neural Voice (Azure) takes this approach. It needs more data (often 30+ minutes) but produces a closer match.
- Few-shot and zero-shot research models. Microsoft's [VALL-E](https://arstechnica.com/information-technology/2023/01/microsofts-new-ai-can-simulate-anyones-voice-with-3-seconds-of-audio/) (2023) generates speech from a 3-second sample, preserving timbre, emotion, and acoustic environment. Still a research model; not a product.
- Underlying neural TTS. Even without cloning, modern systems are fully neural: Tacotron 2 or Transformer TTS for spectrograms, WaveNet, HiFi-GAN, or WaveGlow for the vocoder. [Coqui TTS](https://github.com/coqui-ai/TTS) packages many of these for training and fine-tuning.
- Voice conversion. Take audio from one speaker and transform it to sound like another. Useful if a different actor records the new lines and the result is converted to match the original voice. TTS-with-cloning is more direct in most cases.

Tools and services in use:

- Descript Overdub. [Commercial](https://stripe.com/newsroom/stories/stripe-and-descript), clones your voice from around 10 minutes of speech. Typing a new word in the transcript generates it in your voice with the surrounding acoustic environment matched.
- ElevenLabs. Cloud-based cloning and synthesis from short samples. Used for audiobooks and dubbing.
- Resemble AI. Commercial cloning API: cloning from a few minutes of audio, speech-to-speech conversion, emotion and style controls.
- Open source. [Real-Time Voice Cloning](https://github.com/CorentinJ/Real-Time-Voice-Cloning) for SV2TTS with Tacotron 2 and WaveRNN. Coqui TTS with multi-speaker pretrained models. YourTTS for multilingual zero-shot cloning. VITS for VAE-based TTS with zero-shot capability.

Cloned segments can still sound off, especially in energy or prosody. For short corrections or added phrases, listeners often miss it, particularly when stitching and prosody are handled well (see below).

---

## Audio reconstruction

After the original audio has been marked for cuts and the new synthesised audio is in hand, the pieces have to go together without a visible seam. A few techniques carry most of the weight:

- Word-level cuts with crossfades. Cut at points that won't introduce a click. A short [crossfade](https://manual.audacityteam.org/man/creating_a_crossfade.html) (10-50 ms) overlaps the end of one clip with the start of the next, fading audio out and in to smooth the join. It also softens differences in energy. Most editing tools do this automatically; [Descript reports its cuts as "basically undetectable"](https://stripe.com/newsroom/stories/stripe-and-descript).
- Room tone and background. If the source has noise or reverb, a hard cut makes the background change suddenly. Extracting room tone from the original and crossfading it under edits helps. When inserting synthesised speech, adding a low-level noise floor that matches the surroundings is the same idea. [Descript synthesises in the "same acoustic environment"](https://stripe.com/newsroom/stories/stripe-and-descript) as the surrounding audio.
- Prosody and timing. Inserted words can sound flat next to natural speech if pitch, speed, and intonation do not match. One workaround: synthesise the whole sentence including the new word, then extract only the needed portion. DSP techniques like TD-PSOLA can stretch or pitch-shift the synthesised audio to match neighbours. [Morrison et al. (2021)](https://interactiveaudiolab.github.io/assets/papers/morrison2021context.pdf) call this kind of artefact "prosody discontinuity" and propose a smoothed pitch and duration contour that blends with the context.
- Length and gap. After deleting words, close the gap so the deletion is invisible. Forced alignment provides the precise timings for surgical removal. Pause length between surrounding words may need a small adjustment to keep rhythm believable.
- Longer rewrites. For a whole sentence or an added line, generating the whole new sentence with the voice clone keeps internal prosody consistent. Cross-fading at sentence boundaries or breath pauses is easier than splicing several short fragments.

The principles are the same a human editor uses: cut at natural breakpoints, fade to hide seams, keep noise and pacing consistent. Some systems add neural prosody correction on top. Even basic crossfading and careful alignment produces results that hold up well.

---

## Existing tools and projects

This approach has moved from research to product over the last few years. Descript pioneered the workflow for podcasts and video; others have followed.

[Descript](https://stripe.com/newsroom/stories/stripe-and-descript) is a commercial app for Windows and macOS. It transcribes, aligns text to the waveform, and renders text-driven cuts. Its Overdub feature trains a clone of your voice from around 10 minutes of audio and generates new words in that voice. It also offers one-click filler-word removal, silence trimming, and noise reduction.

[Hindenburg PRO 2](https://thepodcastconsultant.com/blog/hindenburg-pro) is a commercial DAW for Windows and macOS, aimed at radio and podcasts. It added on-device transcription and text-based editing so users edit audio like a document. No voice cloning; new lines have to be re-recorded.

[Audapolis](https://github.com/audapolis/audapolis) is an open-source project for Windows, Linux, and macOS that takes the Descript-style workflow open. Transcribes locally and exposes a word-processor-like editing interface. All processing stays on the machine. No TTS for inserted words.

[Reduct.video](https://reduct.video) is a commercial web platform built around transcript-driven video editing. Cuts and selects snippets via the transcript. Does not generate speech; it is a pure editing surface for existing recordings.

Research has continued. Adobe's VoCo prototyped word insertion. EditSpeech (2021) handles partial inference on edited spectrogram regions. CampNet and FluentEditor (2022-2024) model acoustic context around edits; the [Morrison et al. paper](https://interactiveaudiolab.github.io/assets/papers/morrison2021context.pdf) is the most cited recent work in the line.

Many of the components above are also available as SDKs. NVIDIA's Riva offers ASR and TTS (with voice adaptation) suitable for building a custom editor. ESPnet and Fairseq carry research-grade ASR and TTS models. Wiring them into a UI that non-technical users find intuitive is the harder part; Audapolis shows it can be done outside large companies.

---

A working text-based audio editor combines accurate transcription, forced alignment, voice cloning TTS, and careful audio splicing. Each piece has solid options: Whisper or Deepgram for ASR, MFA or Gentle for alignment, ElevenLabs or an open-source SV2TTS for synthesis. Put together, editing an audiobook or podcast becomes closer to editing a text document, with output that does not give itself away as edited.
