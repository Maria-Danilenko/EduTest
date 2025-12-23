// src/pages/Teacher/StudentPerformanceAnalysisPage.jsx

import React, { useState } from "react";
import {
  Collapse,
  List,
  Button,
  Spin,
  notification,
  Typography,
  Tag,
  Tooltip,
} from "antd";
import axios from "axios";
import moment from "moment";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "react-query";

// subjectId → напрямок (копія з Python)
const SUBJECT_DIRECTION_MAP = {
  1: "Гуманітарні",
  2: "Гуманітарні",
  3: "Гуманітарні",
  4: "Гуманітарні",
  5: "Гуманітарні",
  6: "Гуманітарні",

  7: "Математичні",
  8: "Математичні",
  9: "Математичні",
  21: "Математичні",

  10: "Природничі",
  11: "Природничі",
  12: "Природничі",
  13: "Природничі",
  14: "Природничі",
  15: "Природничі",
  16: "Природничі",

  17: "Суспільні",
  18: "Суспільні",
  19: "Суспільні",
  20: "Суспільні",
  31: "Суспільні",
  32: "Суспільні",

  22: "Інтегровані",

  23: "Технологічні",
  24: "Технологічні",

  25: "Творчі",
  26: "Творчі",
  27: "Творчі",

  28: "Фізкультура",
  29: "Фізкультура",
  30: "Фізкультура",
};

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

// ==============================
// API helpers
// ==============================

const fetchAllSubjects = async (token) => {
  const response = await axios.get("/api/Profile/subject", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data; // [{ id / Id, name / Name }, ...]
};

const fetchTeacherClasses = async (teacherId, token) => {
  const response = await axios.get(
    `/api/Profile/teachers_classes/${teacherId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data; // List<Class>
};

const fetchStudentsInClass = async (classId, token) => {
  const response = await axios.get(`/api/Profile/students_class/${classId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data; // List<Student>
};

// Предмети вчителя (List<string> – назви предметів)
const fetchTeacherSubjects = async (teacherId, token) => {
  const response = await axios.get(
    `/api/Profile/teachers_subject/${teacherId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data; // string[]
};

// Отримання аналізу учня (бекенд сам вирішує, брати з БД чи запускати ML)
const runStudentAnalysis = async (studentId, scope, token) => {
  const response = await axios.get(
    `/api/MLStudentAnalysis/student/${studentId}`,
    {
      params: { scope }, // scope = "all" / "current_class"
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data; // Student_Analysis
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

// ==============================
// Рендер одного блоку аналізу
// ==============================

const renderAnalysisBlock = (
  analysis,
  teacherSubjects,
  allSubjects,
  onClose
) => {
  if (!analysis) return null;

  const scope = analysis.scope;
  const generatedAt = analysis.generated_At;
  const mainProfileText = analysis.main_Profile_Text;

  const directions = Array.isArray(analysis.directions)
    ? analysis.directions
    : [];
  const weakTopics = Array.isArray(analysis.weakTopics)
    ? analysis.weakTopics
    : [];

  const teacherSubjectNames = Array.isArray(teacherSubjects)
    ? teacherSubjects
    : [];

  const teacherWeakTopics =
    teacherSubjectNames.length === 0
      ? []
      : weakTopics.filter((t) => teacherSubjectNames.includes(t.subject_Name));

  const subjectsByDirection = {};
  if (Array.isArray(allSubjects)) {
    allSubjects.forEach((s) => {
      const id = s.id ?? s.Id;
      const name = s.name ?? s.Name;
      const direction = SUBJECT_DIRECTION_MAP[id];
      if (!direction || !name) return;

      if (!subjectsByDirection[direction]) {
        subjectsByDirection[direction] = [];
      }
      if (!subjectsByDirection[direction].includes(name)) {
        subjectsByDirection[direction].push(name);
      }
    });
  }

  const scopeLabel = scope === "current_class" ? "Поточний клас" : "Увесь час";

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
        <Paragraph style={{ whiteSpace: "pre-line", marginBottom: 8 }}>
          {mainProfileText}
        </Paragraph>
      )}

      {/* Коротка статистика за напрямками */}
      {directions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text strong>Коротка статистика за напрямками:</Text>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {directions.map((d) => {
              const dirName = d.direction_Name;
              const subjectsList = subjectsByDirection[dirName] || [];

              const tooltipContent =
                subjectsList.length > 0 ? (
                  <div>
                    {subjectsList.map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </div>
                ) : (
                  <span>Немає предметів у цьому напрямку</span>
                );

              return (
                <li key={d.id ?? `${dirName}-${d.analysis_Id ?? "na"}`}>
                  <Tooltip
                    title={tooltipContent}
                    trigger="click"
                    color="#fff"
                    overlayInnerStyle={{ color: "rgba(0,0,0,0.85)" }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                        marginRight: 4,
                      }}
                    >
                      {dirName}
                    </span>
                  </Tooltip>
                  : середній бал {d.avg_Score}, тестів {d.tests_Count},
                  прогнозований бал {d.forecast_Score} (
                  {levelToText(d.forecast_Level)})
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Відстаючі теми ТІЛЬКИ з предметів цього вчителя */}
      {teacherWeakTopics.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text strong>Найбільш відстаючі теми з ваших предметів:</Text>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {teacherWeakTopics.map((t) => (
              <li
                key={
                  t.id ??
                  `${t.subject_Name}-${t.topic_Name}-${t.analysis_Id ?? "na"}`
                }
              >
                {t.direction_Name}: {t.subject_Name}, тема «{t.topic_Name}»
                (середній бал {t.topic_Score})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ==============================
// Компонент списку учнів одного класу
// ==============================

const ClassStudentsList = ({
  classInfo,
  token,
  teacherSubjects,
  allSubjects,
}) => {
  const [analyses, setAnalyses] = useState({});
  const [loadingMap, setLoadingMap] = useState({}); // ключ: `${studentId}_${scope}`

  const {
    data: students,
    isLoading,
    isError,
    error,
  } = useQuery(
    ["studentsInClass", classInfo.id],
    () => fetchStudentsInClass(classInfo.id, token),
    {}
  );

  const handleRunAnalysis = async (student, scope) => {
    const key = `${student.id}_${scope}`;

    try {
      setLoadingMap((prev) => ({ ...prev, [key]: true }));

      const analysis = await runStudentAnalysis(student.id, scope, token);

      setAnalyses((prev) => ({
        ...prev,
        [student.id]: {
          ...(prev[student.id] || {}),
          [scope]: analysis,
        },
      }));

      notification.success({
        message: "Аналіз оновлено",
        description: `Отримано результати для учня ${student.first_Name} ${
          student.last_Name
        } (${scope === "current_class" ? "поточний клас" : "увесь час"}).`,
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
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 16 }}>
        <Spin />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 16, color: "red" }}>
        Помилка завантаження учнів: {error.message}
      </div>
    );
  }

  if (!students || students.length === 0) {
    return <div style={{ padding: 16 }}>У цьому класі поки немає учнів.</div>;
  }

  return (
    <List
      itemLayout="vertical"
      dataSource={students}
      renderItem={(student) => {
        const fullName = `${student.last_Name} ${student.first_Name} ${
          student.patronymic_Name || ""
        }`.trim();

        const analysisAll = analyses[student.id]?.all;
        const analysisCurrent = analyses[student.id]?.current_class;

        return (
          <List.Item
            key={student.id}
            style={{
              borderBottom: "1px solid #f0f0f0",
              paddingBottom: 8,
            }}
            actions={[
              <Button
                key="all"
                type="primary"
                size="small"
                onClick={() => handleRunAnalysis(student, "all")}
                loading={loadingMap[`${student.id}_all`]}
              >
                Успішність за весь час
              </Button>,
              <Button
                key="current"
                type="default"
                size="small"
                onClick={() => handleRunAnalysis(student, "current_class")}
                loading={loadingMap[`${student.id}_current_class`]}
              >
                Успішність за поточний клас
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <span style={{ fontSize: 16, fontWeight: 500 }}>
                  {fullName}
                </span>
              }
              description={
                <span>
                  ID: {student.id}
                  {student.class_Id && (
                    <span style={{ marginLeft: 8 }}>
                      | Поточний клас ID: {student.class_Id}
                    </span>
                  )}
                </span>
              }
            />
            {/* Блоки аналізів (якщо вже витягнули) */}
            {analysisAll &&
              renderAnalysisBlock(
                analysisAll,
                teacherSubjects,
                allSubjects,
                () => {
                  // закрити "весь час" для цього учня
                  setAnalyses((prev) => {
                    const next = { ...prev };
                    const stu = { ...(next[student.id] || {}) };
                    delete stu.all;
                    if (Object.keys(stu).length === 0) {
                      delete next[student.id];
                    } else {
                      next[student.id] = stu;
                    }
                    return next;
                  });
                }
              )}

            {analysisCurrent &&
              renderAnalysisBlock(
                analysisCurrent,
                teacherSubjects,
                allSubjects,
                () => {
                  // закрити "поточний клас" для цього учня
                  setAnalyses((prev) => {
                    const next = { ...prev };
                    const stu = { ...(next[student.id] || {}) };
                    delete stu.current_class;
                    if (Object.keys(stu).length === 0) {
                      delete next[student.id];
                    } else {
                      next[student.id] = stu;
                    }
                    return next;
                  });
                }
              )}
          </List.Item>
        );
      }}
    />
  );
};

// ==============================
// Головна сторінка для вчителя
// ==============================

const StudentPerformanceAnalysisPage = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  // Класи вчителя
  const {
    data: classes,
    isLoading,
    isError,
    error,
  } = useQuery(
    ["teacherClassesForAnalysis", user?.id],
    () => fetchTeacherClasses(user.id, token),
    { enabled: !!user && !!token }
  );

  // Предмети вчителя
  const {
    data: teacherSubjects,
    isLoading: isTeacherSubjectsLoading,
    isError: isTeacherSubjectsError,
    error: teacherSubjectsError,
  } = useQuery(
    ["teacherSubjects", user?.id],
    () => fetchTeacherSubjects(user.id, token),
    {
      enabled: !!user && !!token,
    }
  );

  // УСІ предмети з БД
  const {
    data: allSubjects,
    isLoading: isAllSubjectsLoading,
    isError: isAllSubjectsError,
    error: allSubjectsError,
  } = useQuery(["allSubjects"], () => fetchAllSubjects(token), {
    enabled: !!user && !!token,
  });

  if (!user || !token) return <div>Authorization required.</div>;

  if (isLoading || isTeacherSubjectsLoading || isAllSubjectsLoading) {
    return (
      <Spin
        size="large"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      />
    );
  }

  if (isError) {
    return (
      <div style={{ color: "red", padding: 16 }}>
        Error loading classes: {error.message}
      </div>
    );
  }

  if (isTeacherSubjectsError) {
    return (
      <div style={{ color: "red", padding: 16 }}>
        Error loading teacher subjects: {teacherSubjectsError.message}
      </div>
    );
  }

  if (isAllSubjectsError) {
    return (
      <div style={{ color: "red", padding: 16 }}>
        Error loading subjects: {allSubjectsError.message}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1>Student Performance Analysis</h1>
      <hr />
      {!classes || classes.length === 0 ? (
        <div>До вас ще не привʼязано жодного класу.</div>
      ) : (
        <Collapse accordion>
          {classes.map((cls) => (
            <Panel
              key={cls.id}
              header={
                <span style={{ fontSize: 16 }}>
                  Клас {cls.number}-{cls.letter}
                </span>
              }
            >
              <ClassStudentsList
                classInfo={cls}
                token={token}
                teacherSubjects={teacherSubjects || []}
                allSubjects={allSubjects || []}
              />
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
};

export default StudentPerformanceAnalysisPage;
