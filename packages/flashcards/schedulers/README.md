# Flashcard Schedulers

This directory contains different spaced repetition scheduling algorithms for the flashcards module.

## Available Schedulers

### Basic Scheduler

A simple scheduler with no complex algorithm. Cards are shown in order and must be explicitly marked as completed.

### FSRS Scheduler

Implementation of the Free Spaced Repetition Scheduler algorithm, which uses a modern approach to optimize memory retention.

### FSRS Levels Scheduler

An implementation of the static scheduler, but using FSRS for determining intervals between quizzes

### SM2 Scheduler

Implementation of the SuperMemo 2 algorithm, which uses quality ratings on a scale of 0-5 to determine when to review cards.

### Static Scheduler

A scheduler with statically-tiered due dates. Good for curricula with predefined progression.

## How to Choose a Scheduler

- **Basic Scheduler**: Simplest, best for small decks where order matters more than optimization.
- **FSRS Scheduler**: Most advanced algorithm, optimized for maximum retention with minimal reviews.
- **FSRS Levels Scheduler**: Probably better than Static Scheduler? But this is still new for me, so I'm figuring it out.
- **SM2 Scheduler**: Good balance of simplicity and effectiveness for most use cases.
- **Static Scheduler**: Best for curricula with levels and predefined learning paths.

## References

- [SM2 Algorithm](https://super-memory.com/english/ol/sm2.htm)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)
