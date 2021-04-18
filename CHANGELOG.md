# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2021-04-18

On the 18th of January 2021 I started with a project to allow myself to create animated scenery and characters using drawn images. In the past 3 months I learned a lot about WebGL, electron and drawing for animations. I'm really happy with the minimal viable product I have now, so today I'm making the release official.

Of course there are improvements to be made (there always are) but for a first release, the current state should be fine 😊

### Added

- `setupWebGL` and `createPlayer` function creating a gepetto player to add animations.
- `prepareAnimation` to convert a Geppetto animation file (`.json`) to precalculated buffers.
- Stopping conflicting animation tracks when an animation is started or a control is used.
- Support for listening to custom events from animations.
