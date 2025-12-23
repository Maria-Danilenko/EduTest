import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  InputNumber,
  Radio,
  Card,
  notification,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import "../../styles/testsStyle.css";
import { useAuth } from "../../context/AuthContext";

const { Option } = Select;
const { TextArea } = Input;

function TestCreatingPage() {
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("/api/Profile/subject")
      .then((response) => {
        setSubjects(response.data);
      })
      .catch((error) => {
        console.error("Failed to fetch subjects:", error);
      });

    axios
      .get("/api/Tests/question_types")
      .then((response) => {
        setQuestionTypes(response.data.map((qt) => ({ ...qt, key: qt.id })));
      })
      .catch((error) => {
        console.error("Failed to fetch question types:", error);
      });
  }, []);

  const isFormValid = (questions) => {
    if (questions.length === 0) {
      return {
        isValid: false,
        message: "The test must contain at least one question.",
      };
    }

    const invalidQuestion = questions.find(
      (question) =>
        question.questionType !== 3 &&
        (!question.variants || question.variants.length === 0)
    );

    if (invalidQuestion) {
      return {
        isValid: false,
        message:
          "Every question (except open-ended) must have at least one answer option.",
      };
    }

    return { isValid: true };
  };

  const onFinish = (values) => {
    const { isValid, message } = isFormValid(values.questions || []);

    if (!isValid) {
      notification.error({
        message: "Validation Error",
        description: message,
      });
      return;
    }

    values.isTimeLimitEnabled = values.isTimeLimitEnabled ?? false;
    let maxScore = 0;
    const teacherId = parseInt(user.id);

    const questionsWithTypeId = values.questions.map((question) => {

  if (question.questionType === 1) {
    const correctAnswerIndex = question.correctAnswer;

    if (
      correctAnswerIndex !== undefined &&
      question.variants &&
      question.variants[correctAnswerIndex]
    ) {
      question.variants[correctAnswerIndex].isCorrect = true;
    }
  }

  const variants =
    question.questionType === 3
      ? []
      : (question.variants || [])
          .filter(v => v)
          .map(variant => ({
            ...variant,
            isCorrect: variant.isCorrect || false,
          }));

  maxScore += question.marks;

  return {
    ...question,
    questionTypeId: question.questionType,
    variants: variants,
    questionType: undefined,
  };
});

    const transformedValues = {
      ...values,
      questions: questionsWithTypeId,
      maxScore,
      teacherId,
    };

    console.log(transformedValues);

    axios
      .post("/api/Tests/create_new_test", transformedValues, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then(() => {
        notification.success({
          message: "Test Created Successfully",
        });
        navigate("/tests-list");
      })
      .catch((error) => {
        notification.error({
          message: "Test Creating Failed",
          description: error || "An error occurred during test creating.",
        });
      });
  };

  return (
    <div className="container mt-4 tests-form">
      <h1 className="mb-3">Test Creating</h1>
      <hr />
      <h2 className="text-center mb-3">Test Details</h2>
      <Form
        form={form}
        name="test-creating-form"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          name="testName"
          label="Test Name"
          rules={[{ required: true, message: "Please input the test name!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea />
        </Form.Item>
        <div className="d-flex">
          <Form.Item
            name="isTimeLimitEnabled"
            label="Duration (in minutes)"
            valuePropName="checked"
            style={{ marginBottom: "30px" }}
          >
            <Checkbox>Time limit</Checkbox>
          </Form.Item>

          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.isTimeLimitEnabled !== currentValues.isTimeLimitEnabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("isTimeLimitEnabled") && (
                <Form.Item
                  label="&nbsp;"
                  name="duration"
                  style={{ width: "185px", marginBottom: "0px" }}
                  className="align-self-end"
                  rules={[
                    { required: true, message: "Please input the duration!" },
                  ]}
                >
                  <InputNumber min={0} placeholder="Duration" />
                </Form.Item>
              )
            }
          </Form.Item>
        </div>
        <Form.Item
          name="subjectId"
          label="Subject"
          rules={[{ required: true, message: "Please select a subject!" }]}
        >
          <Select placeholder="Select a subject" style={{ height: "35px" }}>
            {subjects.map((subject) => (
              <Option key={subject.id} value={subject.id}>
                {subject.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <br />
        <h2 className="text-center mb-3">Test Questions</h2>
        <Form.List name="questions">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Card
                  key={field.key}
                  style={{ marginBottom: "16px", borderColor: "#c4c4c4" }}
                >
                  <div className="d-flex" style={{ marginBottom: "16px" }}>
                    <Form.Item
                      name={[field.name, "questionText"]}
                      rules={[
                        { required: true, message: "Missing question text" },
                      ]}
                      label={`${field.key + 1}. Question Text`}
                      style={{ width: "100%", margin: "0px 15px 5px 0px" }}
                    >
                      <TextArea placeholder="Question Text" />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "marks"]}
                      rules={[{ required: true, message: "Missing marks" }]}
                      label="Marks"
                      style={{ marginRight: "15px", height: "35px" }}
                      className="align-self-top"
                    >
                      <InputNumber min={0} placeholder="Marks" />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "questionType"]}
                      rules={[
                        { required: true, message: "Missing question type" },
                      ]}
                      label="Question Type"
                      style={{ marginRight: "15px" }}
                    >
                      <Select
                        placeholder="Select a question type"
                        style={{ height: "35px", width: "155px" }}
                      >
                        {questionTypes.map((qt) => (
                          <Select.Option key={qt.id} value={qt.id}>
                            {qt.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Button
                      type="primary"
                      danger
                      onClick={() => remove(field.name)}
                      style={{ height: "35px", marginTop: "35px" }}
                      className="align-self-top"
                    >
                      Delete
                    </Button>
                  </div>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, curValues) =>
                      prevValues.questions?.[index]?.questionType !==
                      curValues.questions?.[index]?.questionType
                    }
                  >
                    {() => {
                      const questionType = form.getFieldValue([
                        "questions",
                        index,
                        "questionType",
                      ]);

                      return (
                        questionType !== 3 && (
                          <Form.List name={[field.name, "variants"]}>
                            {(
                              variantFields,
                              { add: addVariant, remove: removeVariant }
                            ) => (
                              <>
                                {variantFields.map(
                                  (variantField, variantIndex) => (
                                    <div
                                      key={variantField.key}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        width: "auto",
                                      }}
                                    >
                                      <Form.Item
                                        {...variantField}
                                        name={[
                                          variantField.name,
                                          "variantText",
                                        ]}
                                        key={[variantField.key, "variantText"]}
                                        rules={[
                                          {
                                            required: true,
                                            message: "Missing variant text",
                                          },
                                        ]}
                                        label={`${
                                          variantIndex + 1
                                        }. Variant Text`}
                                        style={{ flex: 1, marginRight: "10px" }}
                                      >
                                        <Input style={{ width: "100%" }} />
                                      </Form.Item>

                                      {questionType === 1 && (
                                        <Form.Item
                                          name={[field.name, "correctAnswer"]}
                                          style={{
                                            margin: "10px 0px 0px 5px",
                                          }}
                                          rules={[
                                            {
                                              required: true,
                                              message:
                                                "Please select the correct answer.",
                                            },
                                          ]}
                                        >
                                          <Radio.Group>
                                            <Radio value={variantField.name}>
                                              Is Correct
                                            </Radio>
                                          </Radio.Group>
                                        </Form.Item>
                                      )}

                                      {questionType === 2 && (
                                        <Form.Item
                                          name={[
                                            variantField.name,
                                            "isCorrect",
                                          ]}
                                          valuePropName="checked"
                                          style={{
                                            margin: "10px 8px 0px 5px",
                                          }}
                                        >
                                          <Checkbox>Is Correct</Checkbox>
                                        </Form.Item>
                                      )}
                                      {questionType === 4 && (
                                        <Form.Item
                                          {...variantField}
                                          name={[
                                            variantField.name,
                                            "answerText",
                                          ]}
                                          key={[variantField.key, "answerText"]}
                                          rules={[
                                            {
                                              required: true,
                                              message: "Missing answer text",
                                            },
                                          ]}
                                          label="Answer Text"
                                          style={{
                                            flex: 1,
                                            marginRight: "10px",
                                          }}
                                        >
                                          <Input style={{ width: "100%" }} />
                                        </Form.Item>
                                      )}

                                      <Button
                                        type="primary"
                                        danger
                                        onClick={() =>
                                          removeVariant(variantIndex)
                                        }
                                        style={{
                                          margin: "10px 0px 0px 0px",
                                          height: "35px",
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )
                                )}
                                <Button
                                  type="dashed"
                                  onClick={() => addVariant()}
                                  icon={<PlusOutlined />}
                                  style={{ marginTop: "10px" }}
                                >
                                  Add Variant
                                </Button>
                              </>
                            )}
                          </Form.List>
                        )
                      );
                    }}
                  </Form.Item>
                </Card>
              ))}

              <Button
                type="dashed"
                onClick={() => add()}
                icon={<PlusOutlined />}
                style={{
                  marginTop: "20px",
                  marginBottom: "10px",
                  height: "35px",
                }}
              >
                Add Question
              </Button>
            </>
          )}
        </Form.List>
        <Form.Item style={{ display: "flex", justifyContent: "center" }}>
          <Button type="primary" htmlType="submit" style={{ height: "35px" }}>
            Save Test
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default TestCreatingPage;
