import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Modal,
  Progress,
  Form,
  Radio,
  Checkbox,
  Input,
  Select,
  Card,
  Result,
  Spin,
  notification,
} from "antd";
import "../../styles/testsStyle.css";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const { TextArea } = Input;
const { Option } = Select;

function TestTakingPage() {
  const [testData, setTestData] = useState(null);
  const [testResult, setTestResult] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [form] = Form.useForm();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { testId } = useParams();

  useEffect(() => {
    getStudentTestData();
  });
  const getStudentTestData = async () => {
    try {
      const response = await axios.get(
        `/api/Profile/student_tests_id/${testId}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const matchingTest = response.data.find(
        (s) => s.student_Id == user.id && s.state != -1
      );

      if (matchingTest) {
        setIsTestComplete(true);
        setTestResult(matchingTest.score);
      }
    } catch (error) {
      notification.error({
        message: "Error Occurred",
        description:
          typeof error.response?.data === "object"
            ? error.response?.data.message
            : error.response?.data || "An unexpected error occurred.",
      });
    }
  };

  const getTestData = () => {
    axios
      .get(`/api/Tests/get_test/${testId}`)
      .then((response) => {
        setTestData(response.data);
        setTimeLeft(
          response.data.isTimeLimitEnabled ? response.data.duration * 60 : 0
        );
      })
      .catch((error) => {
        console.error("Failed to fetch test data:", error);
      });
  };

  useEffect(() => {
    getTestData();
  }, []);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && testData && testData.isTimeLimitEnabled) {
      setIsModalVisible(true);
      submitResponses();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, testData]);

  const submitResponses = async () => {
    try {
      const values = form.getFieldsValue(true);
      const formattedResponses = testData.questions
        .map((question, qIndex) => {
          switch (question.questionTypeId) {
            case 1:
            case 2:
            case 3:
              return {
                questionId: question.id,
                typeId: question.questionTypeId,
                answer: values[`question-${qIndex}`],
              };
            case 4:
              return {
                questionId: question.id,
                typeId: question.questionTypeId,
                answers: question.variants.map((_, vIndex) => ({
                  variantTextId: question.variants[vIndex].variantText,
                  answerTextId: values[`question-${qIndex}-variant-${vIndex}`],
                })),
              };
            default:
              return null;
          }
        })
        .filter((response) => response !== null);

      const score = calculateScore(formattedResponses);
      setTestResult(score);
      const submissionObj = createSubmissionObject(formattedResponses, score);

      try {
        const response = await axios.post(
          "/api/Tests/student_test",
          submissionObj,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setIsTestComplete(true);
      } catch (error) {
        setIsError(true);
        notification.error({
          message: "Error Occurred",
          description:
            typeof error.response?.data === "object"
              ? error.response?.data.message
              : error.response?.data || "An unexpected error occurred.",
        });
      }
    } catch (errorInfo) {}
  };

  const createSubmissionObject = (responses, score) => {
    return {
      StudentTest: {
        Student_Id: user.id,
        Test_Id: testId,
        Score: score,
        Date_Time_Taken: null,
        State: -1,
      },
      StudentOpenQuestion: responses
        .filter((r) => r.typeId === 3)
        .map((q) => ({
          Question_Id: q.questionId,
          Text: q.answer,
          Score: null,
        })),
    };
  };

  function calculateScore(userResponses) {
    let totalScore = 0;

    userResponses.forEach((response) => {
      const question = testData.questions.find(
        (q) => q.id === response.questionId
      );

      if (!question) return;
      switch (question.questionTypeId) {
        case 1:
          const correctSingleChoiceIndex = question.variants.findIndex(
            (v) => v.isCorrect
          );
          if (response.answer === correctSingleChoiceIndex) {
            totalScore += parseInt(question.marks, 10);
          }
          break;

        case 2:
          const possibleMarks = parseInt(question.marks, 10);

          const correctAnswers = new Set(
            question.variants.filter((v) => v.isCorrect)
            .map(variant => variant.id)
          );

          const marksPerCorrectAnswer = possibleMarks / correctAnswers.size;
          const marksPerIncorrectAnswer =
            possibleMarks / question.variants.length;

          const userAnswers = new Set(response.answer);

          let userCorrectCount = 0;
          userAnswers.forEach((answer) => {
            if (correctAnswers.has(answer)) {
              userCorrectCount++;
            }
          });
          const userIncorrectCount = userAnswers.size - userCorrectCount;

          totalScore += Math.max(
            0,
            parseFloat(
              (
                userCorrectCount * marksPerCorrectAnswer -
                userIncorrectCount * marksPerIncorrectAnswer
              ).toFixed(2)
            )
          );
          break;

        case 3:
          break;

        case 4:
          let questionScore = parseInt(question.marks, 10);
          let perVariantScore = questionScore / question.variants.length;
          response.answers.forEach((answer) => {
            const variant = question.variants.find(
              (v) => v.variantText === answer.variantTextId
            );
            if (variant && variant.answerText === answer.answerTextId) {
              totalScore += perVariantScore;
            }
          });
          break;
        default:
          break;
      }
    });

    return totalScore;
  }

  const showSubmitConfirmation = () => {
    Modal.confirm({
      title: "Are you sure you want to submit your answers?",
      content: "This action cannot be undone.",
      onOk: submitResponses,
    });
  };

  const calculateTimeLeftDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!testData) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Result
        status="warning"
        title="The error was occurred!"
        subTitle={<p style={{ marginTop: "15px" }}>Please try again later</p>}
        extra={[
          <Button
            type="primary"
            key="grades"
            onClick={() => navigate("/grades")}
          >
            Grades
          </Button>,
        ]}
      />
    );
  }

  if (isTestComplete) {
    return (
      <Result
        status="success"
        title="The test was passed successfully!"
        subTitle={
          <h3 style={{ marginTop: "15px" }}>Your score: {testResult}</h3>
        }
        extra={[
          <Button
            type="primary"
            key="grades"
            onClick={() => navigate("/grades")}
          >
            Grades
          </Button>,
        ]}
      />
    );
  }

  return (
    <div className="container mt-4 tests-form">
      <h1>Test Passing</h1>
      <hr />
      <Form form={form} layout="vertical">
        <h2 className="text-center mb-3">{testData.testName}</h2>
        <p className="text-center mb-4">{testData.description}</p>

        {testData.questions.map((question, qIndex) => (
          <Card
            key={qIndex}
            style={{ borderColor: "#c4c4c4", marginBottom: "16px" }}
          >
            <p style={{ marginBottom: "0px" }}>
              {qIndex + 1}. {question.questionText}
            </p>
            <hr style={{ marginTop: "7px" }} />
            {question.questionTypeId === 1 && (
              <Form.Item name={`question-${qIndex}`} style={{ margin: "0px" }}>
                <Radio.Group
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  {question.variants.map((variant, vIndex) => (
                    <Radio
                      key={vIndex}
                      value={vIndex}
                      style={{ marginBottom: "8px" }}
                    >
                      {variant.variantText}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            )}

            {question.questionTypeId === 2 && (
              <Form.Item name={`question-${qIndex}`} style={{ margin: "0px" }}>
                <Checkbox.Group
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  {question.variants.map((variant, vIndex) => (
                    <Checkbox
                      key={vIndex}
                      value={variant.id}
                      style={{ marginBottom: "8px" }}
                    >
                      {variant.variantText}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </Form.Item>
            )}

            {question.questionTypeId === 3 && (
              <Form.Item name={`question-${qIndex}`} style={{ margin: "0px" }}>
                <TextArea placeholder="Your answer" rows={4} />
              </Form.Item>
            )}

            {question.questionTypeId === 4 &&
              question.variants.map((variant, vIndex) => (
                <div
                  key={vIndex}
                  className="mb-2"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <span style={{ flex: 1 }}>{variant.variantText}</span>
                  <Form.Item
                    name={`question-${qIndex}-variant-${vIndex}`}
                    style={{ flex: 1, marginLeft: "10px", marginBottom: "0px" }}
                  >
                    <Select placeholder="Select answer">
                      {question.variants.map((answerVariant, answerIndex) => (
                        <Option
                          key={answerIndex}
                          value={answerVariant.answerText}
                        >
                          {answerVariant.answerText}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              ))}
          </Card>
        ))}

        <Form.Item style={{ display: "flex", justifyContent: "center" }}>
          <Button
            type="primary"
            onClick={showSubmitConfirmation}
            size={"large"}
          >
            Submit Test
          </Button>
        </Form.Item>
      </Form>

      {testData.isTimeLimitEnabled && (
        <div
          style={{
            position: "fixed",
            bottom: "10px",
            right: "10px",
            width: "80px",
            borderRadius: "100%",
            backgroundColor: "white",
          }}
        >
          <Progress
            type="circle"
            percent={(timeLeft / (testData.duration * 60)) * 100}
            format={calculateTimeLeftDisplay}
            status="active"
            size={80}
          />
        </div>
      )}

      <Modal
        title="Time's up!"
        open={isModalVisible}
        onOk={() => {
          setIsModalVisible(false);
          setIsTestComplete(true);
        }}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={() => setIsModalVisible(false)}
          >
            OK
          </Button>,
        ]}
      >
        <p>
          Your time for this test has expired. The test has been automatically
          submitted.
        </p>
      </Modal>
    </div>
  );
}

export default TestTakingPage;
