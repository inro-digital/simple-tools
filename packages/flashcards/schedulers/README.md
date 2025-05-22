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

## Levels Schedulers

The Static and FSRS Levels Schedulers are meant to create a more curriculum-focused style of flashcards, with an unlock and completion system. The most important thresholds here are "passesAt", which unlocks dependent content, and "completesAt", which tells us that this content is mastered.

With consistent "Good" (3) responses on card reviews, users can expect the following progression. These timelines represent typical FSRS scheduling intervals and can vary based on individual performance and specific FSRS parameter tuning:

### Default SRS System (passesAt=3, completesAt=10)

| Repetition | Typical Interval | Cumulative Days |
| ---------- | ---------------- | --------------- |
| 1          | 0.5 days         | 0.5             |
| 2          | 1 day            | 1               |
| 3          | 3 days           | 4               |
| 4          | 7 days           | 11              |
| 5          | 14 days          | 25              |
| 6          | 23 days          | 48              |
| 7          | 35 days          | 83              |
| 8          | 50 days          | 133             |
| 9          | 65 days          | 198             |
| 10         | 85 days          | 283             |

With the Default SRS:

- **Passing threshold** (3 repetitions): ~4-5 days (unlocks dependent content)
- **Completion threshold** (10 repetitions): ~283 days (~9.5 months) (indicates mastery)

### Fast SRS System (passesAt=3, completesAt=8)

| Repetition | Typical Interval | Cumulative Days |
| ---------- | ---------------- | --------------- |
| 1          | 0.5 days         | 0               |
| 2          | 1 days           | 1               |
| 3          | 2 days           | 3               |
| 4          | 5 days           | 8               |
| 5          | 12 days          | 20              |
| 6          | 25 days          | 45              |
| 7          | 40 days          | 85              |
| 8          | 55 days          | 140             |

With the Fast SRS:

- **Passing threshold** (3 repetitions): ~3 days (unlocks dependent content)
- **Completion threshold** (8 repetitions): ~140 days (~4.7 months) (indicates mastery)

Note: These are estimates based on consistently "Good" responses. "Again" responses will delay progression, while "Easy" responses will accelerate it. The FSRS algorithm automatically adjusts intervals based on user performance to optimize retention.
