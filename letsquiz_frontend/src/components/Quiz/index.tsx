import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal } from '../../components/common';
import { selectUI, setLoading, setError, setModal, setFeedback } from '../../store/slices/uiSlice';
import {
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  fetchQuizQuestions, // Import the fetchQuizQuestions thunk
} from '../../store/slices/quizSlice';
import { updatePlayerScore, resetTempScores } from '../../store/slices/groupQuizSlice'; // Import resetTempScores
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';

export const Quiz: React.FC = () => {
  console.log('Quiz component rendering...');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, modals, feedback } = useAppSelector(selectUI);
  const {
    currentQuestion,
    selectedAnswers,
    mode,
    category,
    difficulty,
    error: quizError,
  } = useAppSelector((state) => state.quiz); // Access quiz state except loading and questions

  const quizLoading = useAppSelector((state) => state.quiz.loading);
  const questions = useAppSelector((state) => state.quiz.questions);

  useEffect(() => {
    console.log('Quiz component - quizLoading changed:', quizLoading);
  }, [quizLoading]);

  useEffect(() => {
    console.log('Quiz component - questions length changed:', questions.length);
  }, [questions.length]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const currentQuestionData = questions[currentQuestion];

  // Fetch questions if needed
  useEffect(() => {
    // Only fetch if there are no questions and we are not already loading
    if ((!questions || questions.length === 0) && !quizLoading) {
      // Ensure category and difficulty are selected before fetching
      if (category && difficulty) {
        dispatch(setLoading(true)); // Set UI loading to true before fetching
        dispatch(fetchQuizQuestions({ category, difficulty })).finally(() => {
          dispatch(setLoading(false)); // Set UI loading to false after fetching
        });
      }
    }
  }, [dispatch, category, difficulty]); // Removed quizLoading and questions from dependencies

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      // Check quizLoading as well
      try {
        dispatch(setLoading(true)); // Use UI slice loading for general loading indicator
        // Dispatch selectAnswer action first for immediate UI update
        dispatch(selectAnswer({ questionIndex: currentQuestion, answer }));

        // Check if the selected answer is correct based on the API data
        const isCorrect = answer === currentQuestionData?.correct_answer; // Use correct_answer

        // Update feedback state with animation timing
        dispatch(
          setFeedback({
            show: true,
            isCorrect,
            duration: 1000,
          })
        );

        // Group mode: Player selection for scoring happens after feedback
        // The actual score update will happen when moving to the next question
      } catch (err) {
        dispatch(setError('Error selecting answer')); // Use UI slice error for general error display
      } finally {
        dispatch(setLoading(false)); // Use UI slice loading
      }
    }
  };

  const handleNext = async () => {
    try {
      dispatch(setLoading(true)); // Use UI slice loading
      dispatch(setFeedback({ show: false, isCorrect: false }));

      // Group mode scoring: Apply score if a player was selected for the previous question
      if (mode === 'Group' && selectedPlayer !== null && currentQuestion > 0) {
        const previousQuestionIndex = currentQuestion - 1;
        const previousSelectedAnswer = selectedAnswers[previousQuestionIndex];
        const previousQuestionData = questions[previousQuestionIndex];

        if (
          previousSelectedAnswer !== undefined &&
          previousQuestionData &&
          previousSelectedAnswer === previousQuestionData.correct_answer
        ) {
          // Dispatch the updatePlayerScore action with the selected player's ID and score
          dispatch(updatePlayerScore({ playerId: Number(selectedPlayer), score: 5 })); // Assuming 5 points
        }
      }

      // Reset selected player after scoring or moving to the next question
      setSelectedPlayer(null);
      // Reset temporary scores in the state
      dispatch(resetTempScores());

      if (currentQuestion === questions.length - 1) {
        await dispatch(updateScore());
        navigate('/results');
      } else {
        dispatch(nextQuestion()); // nextQuestion is a simple reducer, no need for await
      }
    } catch (err) {
      dispatch(setError('Error moving to next question')); // Use UI slice error
    } finally {
      dispatch(setLoading(false)); // Use UI slice loading
    }
  };

  const handleQuitConfirm = () => {
    dispatch(resetQuiz());
    dispatch(setModal({ type: 'quitQuiz', isOpen: false }));
    navigate('/');
  };

  // Conditional rendering based on quiz state
  // Conditional rendering based on quiz state
  // if (quizLoading) {
  //   // Show loading spinner while fetching questions
  //   return (
  //     <div className={styles.quiz}>
  //       <Loading />
  //     </div>
  //   );
  // } else
  if (quizError || questions.length === 0) {
    // Show error message if there's a quiz error or no questions are found after loading
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          {quizError || 'No questions found for the selected criteria.'}
        </Typography>
      </div>
    );
  } else {
    // Show quiz questions if not loading and questions are available
    return (
      <div className={styles.quiz}>
        <div className={styles.header}>
          <Typography variant="body1">
            {mode} - {difficulty} - {category}
          </Typography>
          <Typography variant="body1">
            Question {currentQuestion + 1}/{questions.length}
          </Typography>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>

        {mode === 'Group' ? (
          <GroupQuestionView
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            question={currentQuestionData.question_text} // Use question_text
            options={currentQuestionData.answer_options} // Use answer_options
            correctAnswer={currentQuestionData.correct_answer} // Use correct_answer
            onAnswerSelect={handleAnswerSelect}
            showFeedback={feedback.show}
            selectedAnswer={selectedAnswers[currentQuestion]}
            onPlayerSelected={setSelectedPlayer}
            currentScoredPlayer={selectedPlayer}
          />
        ) : (
          <>
            <div className={styles.question}>
              <Typography variant="h2">{currentQuestionData.question_text}</Typography>{' '}
              {/* Use question_text */}
            </div>

            {feedback.show && (
              <Typography
                variant="h3"
                className={styles.feedback}
                style={{
                  color: feedback.isCorrect ? 'var(--color-easy)' : 'var(--color-quit)',
                }}
              >
                {feedback.isCorrect ? 'Correct!' : 'Incorrect!'}
              </Typography>
            )}

            <div className={styles.options}>
              {currentQuestionData.answer_options.map((option: string) => {
                // Use answer_options and explicitly type option
                const isSelected = selectedAnswers[currentQuestion] === option;
                const isCorrectAnswer = option === currentQuestionData.correct_answer; // Use correct_answer
                let optionClassNames = styles.option;

                if (feedback.show) {
                  if (isSelected) {
                    optionClassNames += ` ${styles.selected}`;
                    if (isCorrectAnswer) {
                      optionClassNames += ` ${styles.correct}`;
                    } else {
                      optionClassNames += ` ${styles.incorrect}`;
                    }
                  } else if (isCorrectAnswer) {
                    optionClassNames += ` ${styles.correct}`;
                  }
                }

                return (
                  <Button
                    key={option}
                    variant="secondary"
                    className={optionClassNames}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={hasSelectedAnswer || isLoading || quizLoading} // Disable when loading
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <Button
            variant="quit"
            onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
          >
            Quit
          </Button>
          <Button
            variant="primary"
            disabled={!hasSelectedAnswer || isLoading || quizLoading}
            onClick={handleNext}
          >
            {' '}
            {/* Disable when loading */}
            {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </Button>
        </div>

        <Modal
          open={modals.quitQuiz}
          onClose={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
          title="Quit Quiz"
        >
          <div className={styles.quitDialog}>
            <Typography variant="body1">Are you sure you want to quit?</Typography>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
              >
                No
              </Button>
              <Button variant="quit" onClick={handleQuitConfirm}>
                Yes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <Typography variant="body1">
          {mode} - {difficulty} - {category}
        </Typography>
        <Typography variant="body1">
          Question {currentQuestion + 1}/{questions.length}
        </Typography>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {mode === 'Group' ? (
        <GroupQuestionView
          questionNumber={currentQuestion + 1}
          totalQuestions={questions.length}
          question={currentQuestionData.question_text} // Use question_text
          options={currentQuestionData.answer_options} // Use answer_options
          correctAnswer={currentQuestionData.correct_answer} // Use correct_answer
          onAnswerSelect={handleAnswerSelect}
          showFeedback={feedback.show}
          selectedAnswer={selectedAnswers[currentQuestion]}
          onPlayerSelected={setSelectedPlayer}
          currentScoredPlayer={selectedPlayer}
        />
      ) : (
        <>
          <div className={styles.question}>
            <Typography variant="h2">{currentQuestionData.question_text}</Typography>{' '}
            {/* Use question_text */}
          </div>

          {feedback.show && (
            <Typography
              variant="h3"
              className={styles.feedback}
              style={{
                color: feedback.isCorrect ? 'var(--color-easy)' : 'var(--color-quit)',
              }}
            >
              {feedback.isCorrect ? 'Correct!' : 'Incorrect!'}
            </Typography>
          )}

          <div className={styles.options}>
            {currentQuestionData.answer_options.map((option: string) => {
              // Use answer_options and explicitly type option
              const isSelected = selectedAnswers[currentQuestion] === option;
              const isCorrectAnswer = option === currentQuestionData.correct_answer; // Use correct_answer
              let optionClassNames = styles.option;

              if (feedback.show) {
                if (isSelected) {
                  optionClassNames += ` ${styles.selected}`;
                  if (isCorrectAnswer) {
                    optionClassNames += ` ${styles.correct}`;
                  } else {
                    optionClassNames += ` ${styles.incorrect}`;
                  }
                } else if (isCorrectAnswer) {
                  optionClassNames += ` ${styles.correct}`;
                }
              }

              return (
                <Button
                  key={option}
                  variant="secondary"
                  className={optionClassNames}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={hasSelectedAnswer || isLoading || quizLoading} // Disable when loading
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </>
      )}

      <div className={styles.actions}>
        <Button
          variant="quit"
          onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
        >
          Quit
        </Button>
        <Button
          variant="primary"
          disabled={!hasSelectedAnswer || isLoading || quizLoading}
          onClick={handleNext}
        >
          {' '}
          {/* Disable when loading */}
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </Button>
      </div>

      <Modal
        open={modals.quitQuiz}
        onClose={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
        title="Quit Quiz"
      >
        <div className={styles.quitDialog}>
          <Typography variant="body1">Are you sure you want to quit?</Typography>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
            >
              No
            </Button>
            <Button variant="quit" onClick={handleQuitConfirm}>
              Yes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Quiz;
