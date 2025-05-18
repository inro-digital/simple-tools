import FsrsLevelsScheduler from '@inro/simple-tools/flashcards/schedulers/fsrs-levels'
import type { Assignment, Subject } from '@inro/simple-tools/flashcards'

const scheduler = new FsrsLevelsScheduler({
  srs: {
    '1': {
      id: 1,
      name: 'Default',
      unlocksAt: 0,
      startsAt: 1,
      passesAt: 3,
      completesAt: 6,
    },
  },
  userLevel: 1,
})

const subjects: Subject[] = [
  {
    id: 'math-1',
    learnKeys: ['question'],
    quizKeys: ['answer'],
    data: {
      level: 1,
      srsId: 1,
      position: 0,
      question: 'What is 2+2?',
      answer: '4',
    },
  },
  {
    id: 'math-2',
    learnKeys: ['question'],
    quizKeys: ['answer'],
    data: {
      level: 1,
      srsId: 1,
      position: 1,
      question: 'What is 5+7?',
      answer: '12',
    },
  },
  {
    id: 'geography-1',
    learnKeys: ['question'],
    quizKeys: ['answer'],
    data: {
      level: 2,
      srsId: 1,
      position: 0,
      question: 'What is the capital of France?',
      answer: 'Paris',
    },
  },
]

console.log('=== EXAMPLE: FSRS-LEVELS SCHEDULER ===')

// Create a new assignment for the first subject
let assignment1 = scheduler.add(subjects[0])
console.log('New assignment created:', assignment1)

// Study the card with a "Good" rating (3)
assignment1 = scheduler.update(3, subjects[0], assignment1)
console.log('After first study (Good):', assignment1)

// Study again with an "Easy" rating (4)
assignment1 = scheduler.update(4, subjects[0], assignment1)
console.log('After second study (Easy):', assignment1)

// Study a third time to reach the "passed" threshold (3 repetitions)
assignment1 = scheduler.update(3, subjects[0], assignment1)
console.log('After third study (Good) - should be passed:', assignment1)

// Filter subjects available for learning
const learnableSubjects = subjects.filter((subject) => {
  const assignment = subject.id === 'math-1'
    ? assignment1
    : scheduler.add(subject)
  return scheduler.filterLearnable(subject, assignment)
})
console.log('Learnable subjects:', learnableSubjects.map((s) => s.id))

// Level up
console.log('\n=== USER LEVELS UP TO 2 ===')
scheduler.userLevel = 2

// Now check available subjects again
const availableSubjects = subjects.filter((subject) => {
  const assignment = subject.id === 'math-1'
    ? assignment1
    : scheduler.add(subject)
  return scheduler.filter(subject, assignment)
})
console.log(
  'Available subjects after level up:',
  availableSubjects.map((s) => s.id),
)

// Sort
const sortedSubjects = [...availableSubjects]
  .map((subject) => {
    const assignment = subject.id === 'math-1'
      ? assignment1
      : scheduler.add(subject)
    return [subject, assignment] as [Subject, Assignment]
  })
  .sort((a, b) => scheduler.sort(a, b))
  .map(([subject]) => subject.id)

console.log('Sorted subjects:', sortedSubjects)

// Failed card behavior
console.log('\n=== DEMONSTRATING FAILED CARD ===')
let assignment2 = scheduler.add(subjects[1])
assignment2 = scheduler.update(3, subjects[1], assignment2)
console.log('After first study (Good):', assignment2.repetition)
assignment2 = scheduler.update(1, subjects[1], assignment2)
console.log('After failing (Again):', assignment2.repetition)
console.log('New availability date:', assignment2.availableAt)
