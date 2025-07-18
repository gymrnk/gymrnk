// scripts/seedDatabase.js
// scripts/seedExercises.js
const mongoose = require('mongoose');
const Exercise = require('../models/Exercise');
require('dotenv').config();

const exercises = [
  // ============ CHEST EXERCISES ============
  // Barbell Variations
  {
    name: 'Barbell Bench Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    description: 'Classic chest building exercise',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Incline Barbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Decline Barbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Wide-Grip Barbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Close-Grip Barbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.1,
      volumeWeight: 1.3
    }
  },
  
  // Dumbbell Variations
  {
    name: 'Dumbbell Bench Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Incline Dumbbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Decline Dumbbell Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Dumbbell Flyes',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Incline Dumbbell Flyes',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Dumbbell Pullover',
    muscleGroup: 'chest',
    secondaryMuscles: ['back', 'triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.2,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Hex Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Squeeze Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  
  // Cable Variations
  {
    name: 'Cable Flyes',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Low Cable Flyes',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'High Cable Flyes',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Cable Crossover',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Single-Arm Cable Flye',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  
  // Machine Variations
  {
    name: 'Chest Press Machine',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Pec Deck Machine',
    muscleGroup: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Smith Machine Bench Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Smith Machine Incline Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Hammer Strength Chest Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Converging Chest Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  
  // Bodyweight Variations
  {
    name: 'Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.2,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Wide-Grip Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Diamond Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.1,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Decline Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Incline Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.1,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Archer Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Clap Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 0.8,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Weighted Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Weight Plate',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Weighted Dips',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Dip Station',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Chest Dips',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dip Station',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Ring Dips',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Rings',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Ring Push-ups',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Rings',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  
  // ============ BACK EXERCISES ============
  // Pull-up/Chin-up Variations
  {
    name: 'Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Wide-Grip Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.6,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Chin-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Neutral-Grip Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Weighted Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.5,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Commando Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps', 'abs'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'L-Sit Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps', 'abs'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Muscle-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['chest', 'triceps', 'shoulders'],
    category: 'compound',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.6,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Ring Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Rings',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Assisted Pull-ups',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  
  // Row Variations
  {
    name: 'Barbell Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Pendlay Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Yates Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'T-Bar Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'T-Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Chest-Supported Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Seal Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Meadows Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'One-Arm Dumbbell Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Kroc Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.5,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Dumbbell Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Renegade Row',
    muscleGroup: 'back',
    secondaryMuscles: ['abs', 'shoulders'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Inverted Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Ring Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Rings',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  
  // Cable/Machine Row Variations
  {
    name: 'Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Wide-Grip Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Close-Grip Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Single-Arm Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Low Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'High Cable Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Machine Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Hammer Strength Row',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  
  // Pulldown Variations
  {
    name: 'Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Wide-Grip Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Close-Grip Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Reverse-Grip Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'V-Bar Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Behind-the-Neck Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Single-Arm Lat Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Straight-Arm Pulldown',
    muscleGroup: 'back',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Pullover',
    muscleGroup: 'back',
    secondaryMuscles: ['chest'],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  
  // Deadlift Variations
  {
    name: 'Conventional Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['legs', 'abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.5,
      volumeWeight: 1.6
    }
  },
  {
    name: 'Sumo Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['legs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.4,
      volumeWeight: 1.6
    }
  },
  {
    name: 'Deficit Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['legs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.5,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Rack Pulls',
    muscleGroup: 'back',
    secondaryMuscles: ['legs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.4,
      volumeWeight: 1.7
    }
  },
  {
    name: 'Snatch-Grip Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['legs', 'shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Paused Deadlift',
    muscleGroup: 'back',
    secondaryMuscles: ['legs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Shrugs',
    muscleGroup: 'back',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Dumbbell Shrugs',
    muscleGroup: 'back',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Cable Shrugs',
    muscleGroup: 'back',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Power Shrugs',
    muscleGroup: 'back',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.5,
      volumeWeight: 1.4
    }
  },
  
  // ============ SHOULDER EXERCISES ============
  // Press Variations
  {
    name: 'Overhead Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Military Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Push Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps', 'legs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 0.9,
      muscleActivation: 1.4,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Behind-the-Neck Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Z Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps', 'abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Dumbbell Shoulder Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Arnold Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Seated Dumbbell Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Single-Arm Dumbbell Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps', 'abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Alternating Dumbbell Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Cuban Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Machine Shoulder Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Smith Machine Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.2,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Viking Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Landmine Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps', 'abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Kettlebell Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Kettlebell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  
  // Raise Variations
  {
    name: 'Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Front Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Cable Front Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Machine Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Bent-Over Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Leaning Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Plate Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Weight Plate',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Y-Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Lu Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Band Lateral Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  
  // Rear Delt Exercises
  {
    name: 'Face Pulls',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Rear Delt Flyes',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Reverse Pec Deck',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Rear Delt Flyes',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'High Pulls',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back', 'biceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Band Pull-Aparts',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Reverse Cable Crossover',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Prone Y-Raises',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  
  // Other Shoulder Exercises
  {
    name: 'Upright Row',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['biceps', 'back'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Cable Upright Row',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['biceps', 'back'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Dumbbell Upright Row',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['biceps', 'back'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Clean and Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['legs', 'back', 'triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Hang Clean and Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['back', 'triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Handstand Push-ups',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.6,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Pike Push-ups',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Bradford Press',
    muscleGroup: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Bus Driver',
    muscleGroup: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Weight Plate',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  
  // ============ BICEPS EXERCISES ============
  // Barbell Curls
  {
    name: 'Barbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'EZ-Bar Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'EZ-Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Wide-Grip Barbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Close-Grip Barbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Preacher Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.6,
      volumeWeight: 1.0
    }
  },
  {
    name: 'EZ-Bar Preacher Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'EZ-Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Reverse Barbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Cheat Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.0,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  
  // Dumbbell Curls
  {
    name: 'Dumbbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Hammer Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Alternating Dumbbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Concentration Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.6,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Incline Dumbbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.6,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Spider Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.6,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cross-Body Hammer Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Zottman Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Seated Dumbbell Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Prone Incline Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Waiter Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Dumbbell Preacher Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  
  // Cable Curls
  {
    name: 'Cable Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Cable Hammer Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'High Cable Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Preacher Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Rope Hammer Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Single-Arm Cable Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Lying Cable Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Cable Bayesian Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.6,
      volumeWeight: 0.7
    }
  },
  
  // Machine Curls
  {
    name: 'Machine Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Machine Preacher Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  
  // Other Bicep Exercises
  {
    name: '21s',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.8,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Drag Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Band Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'TRX Curl',
    muscleGroup: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'TRX',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.6
    }
  },
  
  // ============ TRICEPS EXERCISES ============
  // Close-Grip Variations
  {
    name: 'Close-Grip Bench Press',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Close-Grip Incline Press',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Close-Grip Smith Machine Press',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'JM Press',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Board Press',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.3,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Floor Press',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  
  // Extension Variations
  {
    name: 'Overhead Tricep Extension',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'French Press',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'EZ-Bar Skullcrusher',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'EZ-Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Dumbbell Skullcrusher',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Cable Overhead Extension',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Incline Skullcrusher',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Decline Skullcrusher',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Tate Press',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Rolling Tricep Extension',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  
  // Pushdown Variations
  {
    name: 'Tricep Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Rope Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'V-Bar Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Reverse-Grip Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Single-Arm Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Wide-Grip Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Overhead Rope Extension',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  
  // Dip Variations
  {
    name: 'Tricep Dips',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Dip Station',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Bench Dips',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Machine Dips',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Weighted Bench Dips',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  
  // Other Tricep Exercises
  {
    name: 'Tricep Kickback',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Tricep Cable Kickback',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.3,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Close-Grip Push-ups',
    muscleGroup: 'triceps',
    secondaryMuscles: ['chest'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Band Pushdown',
    muscleGroup: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  
  // ============ LEG EXERCISES ============
  // Squat Variations
  {
    name: 'Barbell Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.5
    }
  },
  {
    name: 'Front Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'High Bar Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.5,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Low Bar Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 1.5
    }
  },
  {
    name: 'Box Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.3,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Pause Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Pin Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Zercher Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs', 'back'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Safety Bar Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Safety Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Goblet Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Bulgarian Split Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Split Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Hack Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Smith Machine Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Belt Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Belt Squat Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Landmine Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Pistol Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.6,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Jump Squat',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 0.8,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Sissy Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Wall Sit',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  
  // Deadlift Variations
  {
    name: 'Romanian Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Stiff-Leg Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Trap Bar Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Trap Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.1,
      muscleActivation: 1.4,
      volumeWeight: 1.5
    }
  },
  {
    name: 'Dumbbell Romanian Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Single-Leg Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Snatch-Grip Romanian Deadlift',
    muscleGroup: 'legs',
    secondaryMuscles: ['back', 'shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.2
    }
  },
  
  // Lunge Variations
  {
    name: 'Walking Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Reverse Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Stationary Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Side Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Curtsy Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Jump Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 0.8,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Barbell Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Front Rack Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Overhead Lunges',
    muscleGroup: 'legs',
    secondaryMuscles: ['shoulders', 'abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  
  // Leg Press/Machine Variations
  {
    name: 'Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.4
    }
  },
  {
    name: 'Single-Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Wide-Stance Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Close-Stance Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'High Feet Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Low Feet Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Vertical Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Pendulum Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 1.3
    }
  },
  
  // Isolation Exercises
  {
    name: 'Leg Curl',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Seated Leg Curl',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Nordic Curl',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.7,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Single-Leg Curl',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Standing Leg Curl',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Leg Extension',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Single-Leg Extension',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Spanish Squat',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Good Morning',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Glute Ham Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'GHR Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.6,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Reverse Hyperextension',
    muscleGroup: 'legs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  
  // Step-Up Variations
  {
    name: 'Step-Ups',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Lateral Step-Ups',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Box Step-Ups',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  
  // Calf Exercises
  {
    name: 'Standing Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Seated Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Calf Press on Leg Press',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Leg Press Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Single-Leg Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbell',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Donkey Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Smith Machine Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Smith Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Barbell Calf Raise',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Jump Rope',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'Jump Rope',
    hypertrophyFactors: {
      timeUnderTension: 0.7,
      muscleActivation: 1.2,
      volumeWeight: 0.4
    }
  },
  
  // Glute-Focused
  {
    name: 'Hip Thrust',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.6,
      volumeWeight: 1.3
    }
  },
  {
    name: 'Glute Bridge',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 1.1
    }
  },
  {
    name: 'Single-Leg Hip Thrust',
    muscleGroup: 'legs',
    secondaryMuscles: ['abs'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Cable Pull-Through',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Leg Cable Kickback',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Kettlebell Swing',
    muscleGroup: 'legs',
    secondaryMuscles: ['back', 'abs'],
    category: 'compound',
    equipment: 'Kettlebell',
    hypertrophyFactors: {
      timeUnderTension: 0.9,
      muscleActivation: 1.4,
      volumeWeight: 1.0
    }
  },
  {
    name: 'Clamshells',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Fire Hydrants',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Banded Hip Abduction',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Resistance Band',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Machine Hip Abduction',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Machine Hip Adduction',
    muscleGroup: 'legs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.8
    }
  },
  
  // ============ ABS EXERCISES ============
  // Plank Variations
  {
    name: 'Plank',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Side Plank',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Plank to Push-up',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Mountain Climbers',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.2,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Weighted Plank',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Weight Plate',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'RKC Plank',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Long Lever Plank',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Plank Jacks',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Plank Up-Downs',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Body Saw',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  
  // Crunch Variations
  {
    name: 'Cable Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Machine Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Decline Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Weighted Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Weight Plate',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Bicycle Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Reverse Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Oblique Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Swiss Ball Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Swiss Ball',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Rope Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Long Arm Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  
  // Leg Raise Variations
  {
    name: 'Hanging Leg Raise',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.6,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Hanging Knee Raise',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Captain\'s Chair Leg Raise',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Captain\'s Chair',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Lying Leg Raise',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Dragon Flag',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.8,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Scissor Kicks',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Flutter Kicks',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Leg Raise to Hip Thrust',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Windshield Wipers',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.7,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Toe Touches',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  
  // Rotational Exercises
  {
    name: 'Russian Twist',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Medicine Ball',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Cable Woodchopper',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Landmine 180',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Barbell',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.4,
      volumeWeight: 0.9
    }
  },
  {
    name: 'Pallof Press',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Medicine Ball Slam',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Medicine Ball',
    hypertrophyFactors: {
      timeUnderTension: 0.9,
      muscleActivation: 1.5,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Cable Rotation',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Seated Twist',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Medicine Ball',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.2,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Standing Oblique Crunch',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Side Bend',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.2,
      volumeWeight: 0.7
    }
  },
  
  // Other Ab Exercises
  {
    name: 'Ab Wheel Rollout',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Ab Wheel',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.7,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Dead Bug',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.7,
      muscleActivation: 1.3,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Bird Dog',
    muscleGroup: 'abs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.8,
      muscleActivation: 1.2,
      volumeWeight: 0.4
    }
  },
  {
    name: 'Hollow Body Hold',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  {
    name: 'L-Sit',
    muscleGroup: 'abs',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    equipment: 'Parallettes',
    hypertrophyFactors: {
      timeUnderTension: 2.0,
      muscleActivation: 1.7,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Toes to Bar',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.7,
      volumeWeight: 0.7
    }
  },
  {
    name: 'V-Ups',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.5,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Jackknife Sit-ups',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.5
    }
  },
  {
    name: 'TRX Knee Tuck',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'TRX',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'TRX Pike',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'TRX',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Swiss Ball Pike',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'Swiss Ball',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Swiss Ball Knee Tuck',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Swiss Ball',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.4,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Hanging Windmills',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Pull-up Bar',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.6,
      volumeWeight: 0.6
    }
  },
  {
    name: 'Dragon Flag Negative',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Bench',
    hypertrophyFactors: {
      timeUnderTension: 1.8,
      muscleActivation: 1.6,
      volumeWeight: 0.7
    }
  },
  {
    name: 'Cable Crunches to Push-Down',
    muscleGroup: 'abs',
    secondaryMuscles: [],
    category: 'isolation',
    equipment: 'Cable Machine',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.5,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Inchworm',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.4,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Bear Crawl',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders'],
    category: 'compound',
    equipment: 'None',
    hypertrophyFactors: {
      timeUnderTension: 1.3,
      muscleActivation: 1.3,
      volumeWeight: 0.5
    }
  },
  {
    name: 'Turkish Get-Up',
    muscleGroup: 'abs',
    secondaryMuscles: ['shoulders', 'legs'],
    category: 'compound',
    equipment: 'Kettlebell',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.4,
      volumeWeight: 0.8
    }
  },
  {
    name: 'Farmer\'s Walk',
    muscleGroup: 'abs',
    secondaryMuscles: ['back', 'shoulders'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.5,
      muscleActivation: 1.2,
      volumeWeight: 1.2
    }
  },
  {
    name: 'Suitcase Carry',
    muscleGroup: 'abs',
    secondaryMuscles: ['back'],
    category: 'compound',
    equipment: 'Dumbbells',
    hypertrophyFactors: {
      timeUnderTension: 1.6,
      muscleActivation: 1.3,
      volumeWeight: 1.0
    }
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing exercises
    await Exercise.deleteMany({});
    console.log('Cleared existing exercises');
    
    // Insert new exercises
    await Exercise.insertMany(exercises);
    console.log(`Inserted ${exercises.length} exercises`);
    
    // Count exercises by muscle group
    const muscleGroups = {};
    exercises.forEach(ex => {
      muscleGroups[ex.muscleGroup] = (muscleGroups[ex.muscleGroup] || 0) + 1;
    });
    
    console.log('\nExercises by muscle group:');
    Object.entries(muscleGroups).forEach(([muscle, count]) => {
      console.log(`  ${muscle}: ${count} exercises`);
    });
    
    console.log('\nDatabase seeding completed successfully! 💪');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();