import { Question } from './types';

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const generateOptions = (correct: string, type: 'number' | 'expression' | 'boolean'): string[] => {
  const options = new Set<string>([correct]);
  
  if (type === 'boolean') {
    return ['صحيحة', 'خاطئة'];
  }

  let attempts = 0;
  while (options.size < 4 && attempts < 50) {
    attempts++;
    if (type === 'number') {
      const val = parseFloat(correct);
      if (isNaN(val)) {
        options.add(correct + " " + getRandomInt(1, 5));
      } else {
        const offset = getRandomInt(1, 10);
        const sign = Math.random() > 0.5 ? 1 : -1;
        const option = Math.abs(val + offset * sign).toString();
        if (option !== "0" || val === 0) options.add(option);
      }
    } else {
      // Expression variations
      const variations = [
        correct.replace('+', '-'),
        correct.replace('-', '+'),
        correct.replace('2', '3'),
        correct.replace('x', 'y'),
        correct.replace('y', 'x'),
        "2" + correct,
        correct + " + 1"
      ];
      options.add(variations[getRandomInt(0, variations.length - 1)]);
    }
  }
  
  // Final fallback
  while (options.size < 4) {
    options.add(correct + "_" + options.size);
  }
  
  return shuffleArray(Array.from(options));
};

export const generateQuestion = (difficulty: number = 1): Question => {
  const topics = [
    'literal_expression',
    'substitution',
    'equality_inequality',
    'quadrilaterals',
    'proportionality',
    'percentages',
    'data_organization'
  ];
  
  const topic = topics[getRandomInt(0, topics.length - 1)];
  const id = Math.random().toString(36).substring(7);

  switch (topic) {
    case 'literal_expression': {
      const type = getRandomInt(1, 3);
      if (type === 1) {
        // Simple shape
        const shapes = [
          { name: 'مستطيل', p: (x: string, y: string) => `2(${x} + ${y})`, a: (x: string, y: string) => `${x} × ${y}` },
          { name: 'مربع', p: (x: string) => `4${x}`, a: (x: string) => `${x}²` },
          { name: 'مثلث متساوي الأضلاع', p: (x: string) => `3${x}`, a: null }
        ];
        const shape = shapes[getRandomInt(0, shapes.length - 1)];
        const isArea = Math.random() > 0.5 && shape.a !== null;
        const xVal = difficulty > 4 ? `${getRandomInt(5, 12)}x` : (difficulty > 1 ? `${getRandomInt(2, 5)}x` : 'x');
        const yVal = getRandomInt(4, 15 + difficulty).toString();
        
        const content = `عبر بدلالة x عن ${isArea ? 'مساحة' : 'محيط'} ${shape.name} طول ضلعه ${xVal} ${shape.name === 'مستطيل' ? `وعرضه ${yVal}` : ''}`;
        
        let correct = "";
        if (shape.name === 'مستطيل') {
          if (xVal.includes('x')) {
             const coeff = parseInt(xVal) || 1;
             correct = isArea ? `${coeff * parseInt(yVal)}x` : `2(${xVal} + ${yVal})`;
          } else {
             correct = isArea ? `${yVal}x` : `2(x + ${yVal})`;
          }
        } else if (shape.name === 'مربع') {
          if (xVal.includes('x')) {
            const coeff = parseInt(xVal) || 1;
            correct = isArea ? `${coeff * coeff}x²` : `${4 * coeff}x`;
          } else {
            correct = isArea ? 'x²' : '4x';
          }
        } else {
          const coeff = parseInt(xVal) || 1;
          correct = `${3 * coeff}x`;
        }
        
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: generateOptions(correct, 'expression'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      } else {
        // Combined shapes
        const x = getRandomInt(2, 4 + difficulty);
        const content = `عبر عن مساحة الشكل المكون من مستطيل طوله ${x}x وعرضه 4 ومثلث قاعدته 2x وارتفاعه 5`;
        const correct = `${x * 4 + 5}x`; // (4*x) + (2x*5/2) = 4x + 5x = 9x
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          subContent: `S = (${x}x × 4) + (2x × 5 / 2)`,
          options: generateOptions(correct, 'expression'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      }
    }

    case 'substitution': {
      const xVal = getRandomInt(3, 8 + difficulty);
      const isSquare = difficulty > 2 && Math.random() > 0.4;
      const a = getRandomInt(3, 12 + difficulty);
      const b = getRandomInt(5, 25 + difficulty);
      const c = difficulty > 4 ? getRandomInt(1, 15) : 0;
      
      let content = `احسب قيمة العبارة ${a}${isSquare ? 'x²' : 'x'} + ${b} من أجل x = ${xVal}`;
      let correctValue = a * (isSquare ? xVal * xVal : xVal) + b;
      
      if (c > 0) {
        content = `احسب قيمة العبارة ${a}${isSquare ? 'x²' : 'x'} + ${b}x + ${c} من أجل x = ${xVal}`;
        correctValue = a * (isSquare ? xVal * xVal : xVal) + b * xVal + c;
      }

      const correct = correctValue.toString();
      return {
        id,
        type: 'text',
        answerType: 'choice',
        content,
        options: generateOptions(correct, 'number'),
        correctAnswer: correct,
        timer: difficulty >= 5 ? 150 : (difficulty >= 3 ? 120 : 60)
      };
    }

    case 'equality_inequality': {
      const xVal = getRandomInt(2, 6 + difficulty);
      const a = getRandomInt(3, 10 + difficulty);
      const b = getRandomInt(5, 30 + difficulty);
      const isEquality = Math.random() > 0.5;
      
      const leftVal = a * xVal + b;
      const offset = getRandomInt(0, 5);
      const displayResult = Math.random() > 0.5 ? leftVal : leftVal + (Math.random() > 0.5 ? offset : -offset);
      
      const content = isEquality 
        ? `هل المساواة ${a}x + ${b} = ${displayResult} صحيحة من أجل x = ${xVal}؟`
        : `هل المتباينة ${a}x + ${b} ${Math.random() > 0.5 ? '>' : '<'} ${displayResult} صحيحة من أجل x = ${xVal}؟`;
      
      const expressionResult = a * xVal + b;
      let isCorrect = false;
      if (isEquality) {
        isCorrect = expressionResult === displayResult;
      } else {
        isCorrect = content.includes('>') ? expressionResult > displayResult : expressionResult < displayResult;
      }
      
      const correct = isCorrect ? 'صحيحة' : 'خاطئة';
      
      return {
        id,
        type: 'text',
        answerType: 'choice',
        content,
        options: ['صحيحة', 'خاطئة'],
        correctAnswer: correct,
        timer: difficulty >= 3 ? 120 : 60
      };
    }

    case 'quadrilaterals': {
      const area = getRandomInt(100, 500 + difficulty * 50);
      const side = getRandomInt(10, 25 + difficulty);
      const type = Math.random() > 0.5 ? 'مستطيل' : 'متوازي أضلاع';
      const content = `${type} مساحته ${area}cm² وطول أحد أضلاعه ${side}cm. احسب الارتفاع المتعلق بهذا الضلع (أو العرض).`;
      const correctValue = area / side;
      const correct = correctValue.toFixed(1).replace('.0', '');
      return {
        id,
        type: 'text',
        answerType: 'choice',
        content,
        options: generateOptions(correct, 'number'),
        correctAnswer: correct,
        timer: difficulty >= 3 ? 90 : 60
      };
    }

    case 'proportionality': {
      const type = getRandomInt(1, 3);
      if (type === 1) {
        // Fourth proportional with larger numbers
        const a = getRandomInt(5, 15 + difficulty);
        const b = a * (getRandomInt(3, 10 + difficulty) / 2);
        const c = getRandomInt(20, 50 + difficulty);
        const correctValue = (b * c) / a;
        const correct = correctValue.toFixed(1).replace('.0', '');
        const content = `في جدول تناسبية، الأعداد هي: ${a} يقابلها ${b}، و ${c} يقابلها x. احسب x (الرابع المتناسب).`;
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: generateOptions(correct, 'number'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      } else {
        // Coefficient with potentially non-integer results
        const a = getRandomInt(8, 25 + difficulty);
        const b = a * (getRandomInt(15, 60) / 10);
        const content = `ما هو معامل التناسبية لجدول فيه السطر الأول ${a} والسطر الثاني ${b}؟`;
        const correct = (b / a).toFixed(2).replace('.00', '').replace(/(\.\d)0$/, '$1');
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: generateOptions(correct, 'number'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      }
    }

    case 'percentages': {
      const type = getRandomInt(1, 3);
      if (type === 1) {
        // Multi-step Discount
        const price = getRandomInt(50, 250 + difficulty * 20) * 100;
        const discount = [5, 15, 35, 45, 65][getRandomInt(0, 4)];
        const content = `انخفض سعر سلعة بـ ${discount}%، إذا كان سعرها الأصلي ${price} دج، ما هو السعر الجديد؟`;
        const correct = (price * (1 - discount / 100)).toFixed(0);
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: generateOptions(correct, 'number'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      } else if (type === 2) {
        // Calculate quantity from complex total
        const total = getRandomInt(150, 600 + difficulty * 100);
        const percent = getRandomInt(5, 75);
        const content = `في مؤسسة تربوية تضم ${total} تلميذ، نسبة النجاح هي ${percent}%. ما هو عدد الناجحين؟ (قرب للوحدة)`;
        const correct = Math.round(total * percent / 100).toString();
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: generateOptions(correct, 'number'),
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      } else {
        // Calculate percentage from large numbers
        const total = getRandomInt(500, 2000 + difficulty * 500);
        const part = getRandomInt(50, total / 2);
        const content = `ما هي النسبة المئوية التقريبية لـ ${part} من إجمالي ${total}؟`;
        const correctValue = (part / total * 100);
        const correct = Math.round(correctValue) + "%";
        return {
          id,
          type: 'text',
          answerType: 'choice',
          content,
          options: [correct, (Math.round(correctValue) + 12) + "%", (Math.round(correctValue) - 8) + "%", "50%"],
          correctAnswer: correct,
          timer: difficulty >= 3 ? 120 : 60
        };
      }
    }

    case 'data_organization': {
      const values = [10, 20, 30, 40, 50, 60];
      const total = 100 + (difficulty > 1 ? 100 : 0);
      const val = values[getRandomInt(0, values.length - 1)];
      const content = `إذا كان التكرار الكلي هو ${total} وتكرار القيمة هو ${val}، ما هو التكرار النسبي؟`;
      const correct = (val / total).toString();
      return {
        id,
        type: 'text',
        answerType: 'choice',
        content,
        options: generateOptions(correct, 'number'),
        correctAnswer: correct,
        timer: difficulty >= 3 ? 120 : 60
      };
    }

    default:
      return {
        id,
        type: 'text',
        answerType: 'choice',
        content: "سؤال افتراضي: 5 + 5؟",
        options: ["10", "11", "12", "13"],
        correctAnswer: "10",
        timer: 20
      };
  }
};

export const generateChallengeQuestions = (count: number = 15, difficulty: number = 6): Question[] => {
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(difficulty));
  }
  return questions;
};
