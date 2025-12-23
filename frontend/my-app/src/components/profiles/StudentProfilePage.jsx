import React, { useEffect, useState, useCallback } from "react";
import { notification, Spin, Button, Typography, Tag, Collapse } from "antd";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ==============================
// Допоміжні штуки
// ==============================

const openNotification = () => {
  notification.warning({
    message: "Test Notification",
    description:
      "You have a pending test that needs to be taken. Please check your Tests section.",
    placement: "bottomRight",
    key: "testNotification",
  });
};

// Мапінг рівнів у текст (12-бальна система → 4 рівні)
const levelToText = (level) => {
  switch (level) {
    case 1:
      return "початковий рівень";
    case 2:
      return "середній рівень";
    case 3:
      return "достатній рівень";
    case 4:
      return "високий рівень";
    default:
      return `рівень ${level}`;
  }
};

// Рендер одного блоку аналізу для студента
// (усі відстаючі теми, згруповані: Напрямок → Предмет → Теми)
const renderAnalysisBlock = (analysis, onClose) => {
  if (!analysis) return null;

  const scope = analysis.scope;
  const generatedAt = analysis.generated_At;
  const mainProfileText = analysis.main_Profile_Text;
  const careerText = analysis.career_Text;
  const worseningSubjectsText = analysis.worsening_Subjects_Text;

  const directions = Array.isArray(analysis.directions)
    ? analysis.directions
    : [];
  const weakTopics = Array.isArray(analysis.weakTopics)
    ? analysis.weakTopics
    : [];

  const scopeLabel = scope === "current_class" ? "Поточний клас" : "Увесь час";

  // Групуємо ВСІ відстаючі теми: Напрямок → Предмет → Масив тем
  const groupedWeakTopics = {};
  weakTopics.forEach((t) => {
    const dir = t.direction_Name || "Без напряму";
    const subj = t.subject_Name || "Без предмета";

    if (!groupedWeakTopics[dir]) {
      groupedWeakTopics[dir] = {};
    }
    if (!groupedWeakTopics[dir][subj]) {
      groupedWeakTopics[dir][subj] = [];
    }
    groupedWeakTopics[dir][subj].push(t);
  });

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Tag color={scope === "current_class" ? "blue" : "green"}>
            {scopeLabel}
          </Tag>
          {generatedAt && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Оновлено: {moment(generatedAt).format("DD.MM.YYYY HH:mm")}
            </Text>
          )}
        </div>

        {onClose && (
          <Button
            size="small"
            type="default"
            onClick={onClose}
            style={{
              borderRadius: 6,
              padding: "0 10px",
              height: 26,
            }}
          >
            Закрити аналіз
          </Button>
        )}
      </div>

      {mainProfileText && (
        <>
          <Text strong style={{ fontSize: 16 }}>
            Персоналізовані рекомендації
          </Text>
          <br />
          <Paragraph style={{ whiteSpace: "pre-line", marginBottom: 8 }}>
            {mainProfileText}
          </Paragraph>
        </>
      )}

      {careerText && (
        <Paragraph style={{ whiteSpace: "pre-line", marginBottom: 8 }}>
          {careerText}
        </Paragraph>
      )}

        {/* НОВИЙ БЛОК: предмети з погіршенням */}
      {worseningSubjectsText && (
        <Paragraph style={{ whiteSpace: "pre-line", marginTop: 8 }}>
          {worseningSubjectsText}
        </Paragraph>
      )}

      {/* Коротка статистика за напрямками */}
      {directions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text strong>Коротка статистика за напрямками:</Text>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {directions.map((d) => (
              <li key={d.id ?? `${d.direction_Name}-${d.analysis_Id ?? "na"}`}>
                {d.direction_Name}: середній бал {d.avg_Score}, тестів{" "}
                {d.tests_Count}, прогнозований бал {d.forecast_Score} (
                {levelToText(d.forecast_Level)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Відстаючі теми: Напрямок → Предмет → Теми */}
      {Object.keys(groupedWeakTopics).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text strong>Найбільш відстаючі теми:</Text>

          <Collapse accordion style={{ marginTop: 8 }}>
            {Object.entries(groupedWeakTopics).map(
              ([directionName, subjects]) => (
                <Panel header={directionName} key={directionName}>
                  <Collapse
                    accordion
                    bordered={false}
                    style={{ background: "transparent" }}
                  >
                    {Object.entries(subjects).map(([subjectName, topics]) => (
                      <Panel header={subjectName} key={subjectName}>
                        <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                          {topics.map((t) => (
                            <li
                              key={
                                t.id ??
                                `${t.subject_Name}-${t.topic_Name}-${
                                  t.analysis_Id ?? "na"
                                }`
                              }
                            >
                              тема «{t.topic_Name}» (середній бал{" "}
                              {t.topic_Score})
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    ))}
                  </Collapse>
                </Panel>
              )
            )}
          </Collapse>
        </div>
      )}
    </div>
  );
};

const StudentProfile = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState({
    name: "",
    dob: "",
    email: "",
    class: "",
  });

  // ML-аналіз для учня
  const [analysisAll, setAnalysisAll] = useState(null);
  const [analysisCurrent, setAnalysisCurrent] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState({
    all: false,
    current_class: false,
  });

  const getStudentTests = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/Profile/student_tests/${user.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      return response.data.filter((t) => t.state === -1);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      return [];
    }
  }, [user.id]);

  const getAssignments = useCallback(async (classId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/Profile/assignments_class/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      return [];
    }
  }, []);

  // запуск ML-аналізу для поточного учня
  const handleRunAnalysis = async (scope) => {
    const token = localStorage.getItem("token");
    const studentId = user.id;

    try {
      setAnalysisLoading((prev) => ({ ...prev, [scope]: true }));

      const response = await axios.get(
        `/api/MLStudentAnalysis/student/${studentId}`,
        {
          params: { scope }, // "all" або "current_class"
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const analysis = response.data;

      if (scope === "all") {
        setAnalysisAll(analysis);
      } else if (scope === "current_class") {
        setAnalysisCurrent(analysis);
      }

      notification.success({
        message: "Аналіз оновлено",
        description: `Отримано результати (${
          scope === "current_class" ? "поточний клас" : "увесь час"
        }).`,
      });
    } catch (error) {
      console.error(error);

      let backendMessage = "";
      const data = error?.response?.data;
      if (typeof data === "string") {
        backendMessage = data;
      } else if (data && typeof data === "object") {
        backendMessage = data.message || JSON.stringify(data);
      }

      notification.error({
        message: "Не вдалося отримати аналіз",
        description:
          backendMessage ||
          "Сталася помилка під час отримання ML-аналізу. Перевірте лог бекенду / Python-скрипта.",
      });
    } finally {
      setAnalysisLoading((prev) => ({ ...prev, [scope]: false }));
    }
  };

  useEffect(() => {
    const fetchUserAndClassDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const userResponse = await axios.get(
          `/api/UserAuth/${user.role}/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userData = userResponse.data;

        const classResponse = await axios.get(
          `/api/Profile/student_class/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const classData = classResponse.data;

        setUserDetails({
          name: `${userData.first_Name} ${userData.last_Name} ${userData.patronymic_Name}`,
          dob: moment(userData.date_Of_Birth).format("DD.MM.YYYY"),
          email: userData.email,
          class: `${classData.number}-${classData.letter}`,
        });

        if (classData.id) {
          const assignments = await getAssignments(classData.id);
          const studentTests = await getStudentTests();
          if (assignments.length > 0 && studentTests.length > 0) {
            openNotification();
          }
        }
      } catch (error) {
        console.error("Failed to fetch user or class details:", error);
        notification.error({
          message: "Error Fetching Data",
          description: "Failed to fetch user or class details.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user.id && user.role) {
      fetchUserAndClassDetails();
    }
  }, [user.id, user.role, getAssignments, getStudentTests]);

  if (loading) {
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

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <div>
          <h1>{userDetails.name}</h1>
          <div
            style={{
              backgroundColor: "#f2f2f2",
              width: "100px",
              padding: "7px 0",
              textAlign: "center",
            }}
          >
            Student
          </div>
        </div>
      </div>
      <hr />
      <div>
        <h2 style={{ color: "gray", marginBottom: "20px" }}>Details</h2>
        <p>
          <b>Class</b>
          <br />
          {userDetails.class}
        </p>
        <p>
          <b>Date of birth</b>
          <br />
          {userDetails.dob}
        </p>
        <p>
          <b>Email</b>
          <br />
          {userDetails.email}
        </p>
      </div>

      <hr />

      {/* Блок ML-аналізу для учня */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ color: "gray", marginBottom: 12 }}>
          My Learning Analysis
        </h2>
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            size="small"
            onClick={() => handleRunAnalysis("all")}
            loading={analysisLoading.all}
            style={{ marginRight: 8 }}
          >
            Успішність за весь час
          </Button>
          <Button
            type="default"
            size="small"
            onClick={() => handleRunAnalysis("current_class")}
            loading={analysisLoading.current_class}
          >
            Успішність за поточний клас
          </Button>
        </div>

        {analysisAll &&
          renderAnalysisBlock(analysisAll, () => setAnalysisAll(null))}

        {analysisCurrent &&
          renderAnalysisBlock(analysisCurrent, () => setAnalysisCurrent(null))}
      </div>
    </div>
  );
};

export default StudentProfile;
