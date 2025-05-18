# Flashcard Schedulers

This directory contains different spaced repetition scheduling algorithms for the flashcards module.

## Available Schedulers

### Basic Scheduler

A simple scheduler with no complex algorithm. Cards are shown in order and must be explicitly marked as completed.

### SM2 Scheduler

Implementation of the SuperMemo 2 algorithm, which uses quality ratings on a scale of 0-5 to determine when to review cards.

### Static Scheduler

A scheduler with statically-tiered due dates. Good for curricula with predefined progression.

### FSRS Scheduler

Implementation of the Free Spaced Repetition Scheduler algorithm, which uses a modern approach to optimize memory retention.

### FSRS Levels Scheduler

An implementation of the static scheduler, but using FSRS for determining intervals between quizzes

## How to Choose a Scheduler

- **Basic Scheduler**: Simplest, best for small decks where order matters more than optimization.
- **SM2 Scheduler**: Good balance of simplicity and effectiveness for most use cases.
- **Static Scheduler**: Best for curricula with levels and predefined learning paths.
- **FSRS Scheduler**: Most advanced algorithm, optimized for maximum retention with minimal reviews.
- **FSRS Levels Scheduler**: Probably better than Static Scheduler? But this is still new for me, so I'm figuring it out.

### Example Usage

```ts
import FsrsScheduler from '@inro/simple-tools/flashcards/schedulers/fsrs'

const scheduler = new FsrsScheduler()

// Create FSRS scheduler with custom parameters
const customScheduler = new FsrsScheduler({
  requestRetention: 0.85, // Target retention rate (0-1)
  maximumInterval: 36500, // Maximum interval in days
  w: [0.4, 0.6, 2.4, 5.8 /* etc etc */],
})
const assignment = scheduler.add(subject)

// Update a card based on user performance (1-4 rating)
const updatedAssignment = scheduler.update(3, subject, assignment)
```

## References

- [SM2 Algorithm](https://super-memory.com/english/ol/sm2.htm)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/discussions/3)
