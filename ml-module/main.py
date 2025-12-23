import sys
import re
import urllib.parse
import numpy as np
import pandas as pd
import pyodbc
from sqlalchemy import create_engine
from sklearn.preprocessing import MinMaxScaler
from sklearn.tree import DecisionTreeClassifier


if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")


# ============================================================
# 0. Налаштування
# ============================================================

TARGET_STUDENT_ID = 1  # ID студента, якого аналізуємо

# Період аналізу:
#   "all"           – аналіз всіх доступних результатів
#   "current_class" – лише період поточного класу (за даними student та student_class_history)
ANALYSIS_SCOPE = "all"  # або "current_class"

RAW_CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-GF8REUK\\SQLEXPRESS;"
    "DATABASE=EduTestDB;"
    "Trusted_Connection=yes;"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

quoted_params = urllib.parse.quote_plus(RAW_CONNECTION_STRING)
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={quoted_params}")

# subject_id → напрямок навчання
SUBJECT_DIRECTION_MAP = {
    1: "Гуманітарні", 2: "Гуманітарні", 3: "Гуманітарні", 4: "Гуманітарні",
    5: "Гуманітарні", 6: "Гуманітарні",

    7: "Математичні", 8: "Математичні", 9: "Математичні",
    21: "Математичні",

    10: "Природничі", 11: "Природничі", 12: "Природничі", 13: "Природничі",
    14: "Природничі", 15: "Природничі", 16: "Природничі",

    17: "Суспільні", 18: "Суспільні", 19: "Суспільні", 20: "Суспільні",
    31: "Суспільні", 32: "Суспільні",

    22: "Інтегровані",

    23: "Технологічні", 24: "Технологічні",

    25: "Творчі", 26: "Творчі", 27: "Творчі",

    28: "Фізкультура", 29: "Фізкультура", 30: "Фізкультура",
}


def detect_direction(subject_id: int) -> str:
    return SUBJECT_DIRECTION_MAP.get(subject_id, "Інше")


# Напрямок → можливі карʼєрні траєкторії
CAREER_SUGGESTIONS = {
    "Математичні": "інженерні спеціальності, програмування, аналіз даних, фінансова аналітика",
    "Природничі": "медицина, біологія, екологія, лабораторні та наукові дослідження",
    "Гуманітарні": "журналістика, філологія, право, переклад, педагогіка",
    "Суспільні": "право, політологія, соціологія, менеджмент, публічне управління",
    "Технологічні": "інженерія, робототехніка, технології виробництва",
    "Творчі": "дизайн, мистецтво, музика, креативні індустрії",
    "Фізкультура": "спорт, фізична реабілітація, тренерська діяльність",
    "Інтегровані": "міждисциплінарні напрями, STEAM-проєкти, освітні технології",
    "Інше": "індивідуально підібрані міждисциплінарні освітні траєкторії",
}

# ============================================================
# Рівні успішності за 12-бальною шкалою
# ============================================================

def score_to_level(score: float) -> int:
    if score <= 3:
        return 0
    elif score <= 6:
        return 1
    elif score <= 9:
        return 2
    else:
        return 3


LEVEL_NAME_MAP = {
    0: "початковий (1–3 бали)",
    1: "середній (4–6 балів)",
    2: "достатній (7–9 балів)",
    3: "високий (10–12 балів)",
}

LEVEL_SHORT_NAME = {
    0: "початковий",
    1: "середній",
    2: "достатній",
    3: "високий",
}


def level_to_name(level: int) -> str:
    return LEVEL_NAME_MAP.get(level, "невідомий рівень")


def format_forecast_level(score: float) -> str:
    """
    Формат для прогнозу: "достатній (8 балів)"
    """
    lvl = score_to_level(score)
    short = LEVEL_SHORT_NAME.get(lvl, "невідомий рівень")
    return f"{short} ({round(score)} балів)"


# ============================================================
# Витяг теми з назви тесту
# ============================================================

def extract_topic_from_test_name(test_name: str) -> str:
    """
    Витягує тему з назви тесту:
    шукаємо перший фрагмент у будь-яких лапках (' " « » …).
    Якщо нічого не знайшли – "невизначена тема".
    """
    if not isinstance(test_name, str):
        return "невизначена тема"

    pattern = r"[\"'«»“”„‟‚‘’`](.+?)[\"'«»“”„‟‚‘’`]"
    m = re.search(pattern, test_name)
    if m:
        return m.group(1).strip()
    return "невизначена тема"


# ============================================================
# 1. Завантаження даних з БД (усі учні)
# ============================================================

def load_all_scores() -> pd.DataFrame:
    """
    Витягуємо ВСІ проходження тестів (усіх студентів) зі state = 1.
    (Без урахування класів — клас/період підтягуємо окремо через student_class_history.)
    """
    query = """
    SELECT
        st.[student_id],
        s.[first_name],
        s.[last_name],
        s.[patronymic_name],
        st.[test_id],
        st.[score],
        st.[state],
        st.[date_time_taken],
        t.[name] AS test_name,
        subj.[id] AS subject_id,
        subj.[name] AS subject_name
    FROM [EduTestDB].[dbo].[student_test] AS st
        INNER JOIN [EduTestDB].[dbo].[student] AS s
            ON s.[id] = st.[student_id]
        INNER JOIN [EduTestDB].[dbo].[test] AS t
            ON t.[id] = st.[test_id]
        INNER JOIN [EduTestDB].[dbo].[subject] AS subj
            ON subj.[id] = t.[subject_id]
    WHERE
        st.[state] = 1;
    """
    df = pd.read_sql(query, engine)

    # Витягуємо тему з назви тесту
    df["topic"] = df["test_name"].apply(extract_topic_from_test_name)

    # Кодуємо тему як категорію для моделі
    df["topic_id"], _ = pd.factorize(df["topic"])

    return df


# ============================================================
# 1.1. Період поточного класу (через student + student_class_history)
# ============================================================

def get_current_class_period(student_id: int):
    """
    Визначає період поточного класу студента:
      1) читаємо current_class_id з таблиці student;
      2) шукаємо останній запис у student_class_history для цього class_id;
      3) повертаємо (class_id, date_from, date_to).
    Якщо date_to = NULL, вважаємо верхню межу 9999-12-31.
    Якщо щось не знайшли — повертаємо (None, None, None).
    """

    # 1) Поточний class_id з профілю
    q_profile = f"""
        SELECT [class_id]
        FROM [EduTestDB].[dbo].[student]
        WHERE [id] = {student_id}
    """
    df_profile = pd.read_sql(q_profile, engine)

    if df_profile.empty or pd.isna(df_profile.iloc[0]["class_id"]):
        print(f"DEBUG: student_id={student_id}: не знайдено current class у таблиці student")
        return None, None, None

    current_class_id = int(df_profile.iloc[0]["class_id"])
    print(f"DEBUG: student_id={student_id}: current_class_id={current_class_id}")

    # 2) Період у цьому класі з історії
    q_period = f"""
        SELECT TOP 1 [date_from], [date_to]
        FROM [EduTestDB].[dbo].[student_class_history]
        WHERE [student_id] = {student_id} AND [class_id] = {current_class_id}
        ORDER BY [date_from] DESC;
    """
    df_period = pd.read_sql(q_period, engine)

    if df_period.empty:
        print(f"DEBUG: student_id={student_id}, class_id={current_class_id}: записів у student_class_history немає")
        return current_class_id, None, None

    date_from = df_period.iloc[0]["date_from"]
    date_to = df_period.iloc[0]["date_to"]

    if pd.isna(date_to):
        date_to = pd.to_datetime("9999-12-31")

    print(f"DEBUG: student_id={student_id}, class_id={current_class_id}: "
          f"period {date_from} .. {date_to}")

    return current_class_id, date_from, date_to


def filter_student_scope(df_student: pd.DataFrame) -> pd.DataFrame:
    df = df_student.copy()

    if ANALYSIS_SCOPE == "all":
        return df

    if ANALYSIS_SCOPE == "current_class":
        class_id, date_from, date_to = get_current_class_period(TARGET_STUDENT_ID)

        if class_id is None or date_from is None:
            return df

        mask = (
            df["date_time_taken"] >= pd.to_datetime(date_from)
        ) & (
            df["date_time_taken"] <= pd.to_datetime(date_to)
        )

        df_filtered = df[mask]
        return df_filtered

    return df


# ============================================================
# 2. Навчання глобальної ML-моделі
# ============================================================

def train_global_model(df_all: pd.DataFrame):
    df = df_all.copy()
    df["level"] = df["score"].apply(score_to_level)

    X = df[["score", "subject_id", "topic_id"]]
    y = df["level"]

    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    model = DecisionTreeClassifier(
        criterion="gini",
        max_depth=6,
        random_state=42
    )
    model.fit(X_scaled, y)

    return model, scaler


def apply_model_to_student(df_student: pd.DataFrame, model, scaler) -> pd.DataFrame:
    df = df_student.copy()
    X = df[["score", "subject_id", "topic_id"]]
    X_scaled = scaler.transform(X)
    df["predicted_level"] = model.predict(X_scaled)
    return df


# ============================================================
# 3. Трендове прогнозування по останніх оцінках (по напрямку)
# ============================================================

def forecast_direction_score(df_dir: pd.DataFrame) -> float:
    """
    Прогнозована ОЦІНКА для НАПРЯМКУ з урахуванням останніх оцінок.
    - базово: експоненційно зважене середнє по балах (останні важать більше);
    - якщо останні оцінки помітно нижчі/вищі за попередні — коригуємо на ±0.5.
    """
    df_dir = df_dir.sort_values("date_time_taken")
    scores = df_dir["score"].to_numpy(dtype=float)
    n = len(df_dir)

    if n == 0:
        return 0.0
    if n <= 2:
        return float(np.mean(scores))

    alpha = 0.6
    weights = np.array([alpha ** (n - 1 - i) for i in range(n)], dtype=float)
    base_score = float(np.sum(scores * weights) / np.sum(weights))

    if n >= 4:
        tail = min(4, n // 2)
        prev_scores = scores[:-tail]
        last_scores = scores[-tail:]

        if len(prev_scores) >= 3:
            prev_mean = float(np.mean(prev_scores))
            last_mean = float(np.mean(last_scores))

            if last_mean <= prev_mean - 1.0:
                base_score -= 0.5
            elif last_mean >= prev_mean + 1.0:
                base_score += 0.5

    base_score = max(1.0, min(12.0, base_score))
    return base_score


# ============================================================
# 3.1. Пошук предметів із явно погіршеною динамікою
# ============================================================

def find_worsening_subjects(df: pd.DataFrame) -> list[str]:
    worsening: list[str] = []

    for subject, part in df.groupby("subject_name"):
        part = part.sort_values("date_time_taken")
        scores = part["score"].to_numpy(dtype=float)
        n = len(scores)

        if n < 5:
            continue

        tail = min(4, n // 2)
        prev_scores = scores[:-tail]
        last_scores = scores[-tail:]

        if len(prev_scores) < 3:
            continue

        prev_mean = float(np.mean(prev_scores))
        last_mean = float(np.mean(last_scores))

        if last_mean <= prev_mean - 0.5:
            worsening.append(subject)

    return sorted(set(worsening))


# ============================================================
# 4. Рекомендації по напрямках і темах
# ============================================================

def generate_direction_and_topic_recommendations(df_student_pred: pd.DataFrame):
    """
    Формує статистику по напрямках і рекомендації.
    Тепер додано:
      🆕 Найслабші теми по ВСІХ предметах.
      🆕 Ігнорування предметів, якщо найслабша тема має високий рівень (10–12).
    """
    df = df_student_pred.copy()
    df["direction"] = df["subject_id"].apply(detect_direction)

    # ============================================================
    # 1. Статистика по темах
    # ============================================================
    topic_stats = (
        df.groupby(["direction", "subject_name", "topic"])
          .agg(avg_score=("score", "mean"), tests_count=("score", "count"))
          .reset_index()
    )
    topic_stats["avg_score"] = topic_stats["avg_score"].round(2)

    # ============================================================
    # 2. Статистика по напрямках
    # ============================================================
    dir_stats = (
        df.groupby("direction")
          .agg(
              avg_score=("score", "mean"),
              avg_level=("predicted_level", "mean"),
              tests_count=("score", "count")
          )
          .reset_index()
    )
    dir_stats["avg_score"] = dir_stats["avg_score"].round(2)
    dir_stats["avg_level"] = dir_stats["avg_level"].round(2)

    # Для зручності список предметів у кожному напрямку
    subjects_per_direction = (
        df.groupby("direction")["subject_name"]
          .apply(lambda s: sorted(set(s)))
          .to_dict()
    )

    # ============================================================
    # 3. Формуємо прогноз для кожного напрямку
    # ============================================================
    forecast_info = []

    for _, row in dir_stats.iterrows():
        direction = row["direction"]
        avg_score = float(row["avg_score"])
        avg_level_num = float(row["avg_level"])
        tests_count = int(row["tests_count"])

        hist_level_int = int(round(avg_level_num))
        hist_level_text = level_to_name(hist_level_int)

        df_dir = df[df["direction"] == direction]
        forecast_score = forecast_direction_score(df_dir)
        forecast_level_int = score_to_level(forecast_score)
        forecast_level_display = format_forecast_level(forecast_score)

        forecast_info.append({
            "direction": direction,
            "avg_score": avg_score,
            "hist_level": hist_level_text,
            "hist_level_num": hist_level_int,
            "forecast_score": round(forecast_score, 2),
            "forecast_level": level_to_name(forecast_level_int),
            "forecast_level_num": forecast_level_int,
            "forecast_level_display": forecast_level_display,
            "tests_count": tests_count,
        })

    forecast_df = pd.DataFrame(forecast_info)

    # ============================================================
    # 4. Найсильніший напрямок
    # ============================================================
    if not forecast_df.empty:
        primary_row = (
            forecast_df.sort_values(
                by=["forecast_level_num", "forecast_score", "tests_count"],
                ascending=[False, False, False]
            ).iloc[0]
        )

        primary_direction = primary_row["direction"]
        primary_forecast_level_display = primary_row["forecast_level_display"]
        primary_avg_score = primary_row["avg_score"]
        primary_tests = int(primary_row["tests_count"])

        primary_subjects = subjects_per_direction.get(primary_direction, [])
        primary_subjects_str = ", ".join(primary_subjects) if primary_subjects else "—"

        primary_careers = CAREER_SUGGESTIONS.get(
            primary_direction, CAREER_SUGGESTIONS["Інше"]
        )
    else:
        primary_direction = None

    # ============================================================
    # 5. Слабкі напрямки (стара логіка)
    # ============================================================
    weak_recommendation_text = None
    weak_topics_struct = []

    if not forecast_df.empty and len(forecast_df) > 1:
        min_level = forecast_df["forecast_level_num"].min()
        level_filtered = forecast_df[forecast_df["forecast_level_num"] == min_level]

        min_avg = level_filtered["avg_score"].min()
        weak_dirs_df = level_filtered[level_filtered["avg_score"] <= min_avg + 0.5]

        weak_blocks = []

        for _, wrow in weak_dirs_df.iterrows():
            wd = wrow["direction"]
            wd_avg_score = wrow["avg_score"]
            wd_tests = int(wrow["tests_count"])

            ts_dir = topic_stats[topic_stats["direction"] == wd]
            if ts_dir.empty:
                continue

            min_topic_avg = ts_dir["avg_score"].min()
            weakest_rows = ts_dir[ts_dir["avg_score"] <= min_topic_avg + 0.5]

            topic_descs = []
            for _, trow in weakest_rows.iterrows():
                subject = trow["subject_name"]
                topic = trow["topic"]
                t_avg = trow["avg_score"]

                weak_topics_struct.append({
                    "direction": wd,
                    "subject": subject,
                    "topic": topic,
                    "score": float(t_avg),
                })

                topic_descs.append(
                    f"{subject}, тема «{topic}» (середній бал {t_avg})"
                )

            topics_str = "; ".join(topic_descs) if topic_descs else "—"

            weak_blocks.append(
                f"• напрямок «{wd}» (середній бал {wd_avg_score}, тестів {wd_tests}); "
                f"найбільше відстають: {topics_str}"
            )

        if weak_blocks:
            weak_recommendation_text = (
                "Для збалансованого розвитку варто посилити підтримку "
                "в таких напрямах та темах:\n" + "\n".join(weak_blocks)
            )

    # ============================================================
    # 6. 🆕 Найслабші теми по ВСІХ ПРЕДМЕТАХ (нова логіка)
    # ============================================================
    weak_topics_all_subjects = []

    for subject, part in df.groupby("subject_name"):
        topic_means = (
            part.groupby("topic")["score"]
                .mean()
                .reset_index()
        )
        topic_means["score"] = topic_means["score"].round(2)

        min_score = topic_means["score"].min()
        worst_topics = topic_means[topic_means["score"] == min_score]

        if score_to_level(min_score) == 3:
            continue

        for _, trow in worst_topics.iterrows():
            weak_topics_all_subjects.append({
                "direction": detect_direction(
                    df[df["topic"] == trow["topic"]]["subject_id"].iloc[0]
                ),
                "subject": subject,
                "topic": trow["topic"],
                "score": float(trow["score"]),
            })

    weak_topics_struct.extend(weak_topics_all_subjects)

    # ============================================================
    # 7. Погіршення у предметах (стара логіка)
    # ============================================================
    worsening_subjects = find_worsening_subjects(df)
    worsening_text = None

    if worsening_subjects:
        subj_str = ", ".join(worsening_subjects)
        worsening_text = (
            f"Окремо слід звернути увагу на предмет(и): {subj_str}, "
            f"де в динаміці результатів простежується зниження оцінок."
        )

    # ============================================================
    # 8. Формуємо текст рекомендацій
    # ============================================================
    recommendations = []

    if primary_direction is not None:
        recommendations.append(
            f"Основний освітній профіль: найсильніший напрямок — «{primary_direction}» "
            f"(середній бал {primary_avg_score}, прогнозований рівень: {primary_forecast_level_display})."
        )
        recommendations.append(
            f"Карʼєрні рекомендації: {CAREER_SUGGESTIONS.get(primary_direction)}."
        )

    if weak_recommendation_text:
        recommendations.append(weak_recommendation_text)

    if worsening_text:
        recommendations.append(worsening_text)

    return forecast_df, recommendations, weak_topics_struct


# ============================================================
# 6. Збереження результатів аналізу в БД
# ============================================================

def upsert_student_analysis(student_id, scope, class_id,
                            main_profile_text, career_text,
                            weak_directions_text, worsening_subjects_text):
    conn = pyodbc.connect(RAW_CONNECTION_STRING)
    cursor = conn.cursor()

    if scope == "all":
        cursor.execute("""
            SELECT id FROM dbo.student_analysis
            WHERE student_id = ? AND scope = N'all'
        """, (student_id,))
    else:
        cursor.execute("""
            SELECT id FROM dbo.student_analysis
            WHERE student_id = ? AND scope = N'current_class' AND class_id = ?
        """, (student_id, class_id))

    row = cursor.fetchone()

    if row:
        analysis_id = row.id
        cursor.execute("""
            UPDATE dbo.student_analysis
            SET 
                class_id = ?, 
                generated_at = SYSDATETIME(),
                main_profile_text = ?,
                career_text = ?,
                weak_directions_text = ?,
                worsening_subjects_text = ?
            WHERE id = ?
        """, (
            class_id,
            main_profile_text,
            career_text,
            weak_directions_text,
            worsening_subjects_text,
            analysis_id
        ))

        conn.commit()
        cursor.close()
        conn.close()
        return analysis_id

    cursor.execute("""
        INSERT INTO dbo.student_analysis(
            student_id, scope, class_id,
            main_profile_text, career_text,
            weak_directions_text, worsening_subjects_text
        ) OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id, scope, class_id,
        main_profile_text, career_text,
        weak_directions_text, worsening_subjects_text
    ))

    analysis_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return analysis_id


def replace_analysis_directions(analysis_id, forecast_df: pd.DataFrame):
    """Перезаписує статистику напрямків (direction rows)."""
    conn = pyodbc.connect(RAW_CONNECTION_STRING)
    cursor = conn.cursor()

    # Видаляємо старі записи
    cursor.execute("""
        DELETE FROM dbo.student_analysis_direction
        WHERE analysis_id = ?
    """, (analysis_id,))

    # Додаємо нові
    for _, row in forecast_df.iterrows():
        cursor.execute("""
            INSERT INTO dbo.student_analysis_direction(
                analysis_id, direction_name,
                avg_score, hist_level,
                forecast_score, forecast_level,
                tests_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            analysis_id,
            row["direction"],
            float(row["avg_score"]),
            int(row["hist_level_num"]),
            float(row["forecast_score"]),
            int(row["forecast_level_num"]),
            int(row["tests_count"])
        ))

    conn.commit()
    cursor.close()
    conn.close()


def replace_analysis_weak_topics(analysis_id, weak_topics: list[dict]):
    """
    weak_topics — список dict:
    [
        {
            "direction": "...",
            "subject": "...",
            "topic": "...",
            "score": 6.0
        },
        ...
    ]
    """
    conn = pyodbc.connect(RAW_CONNECTION_STRING)
    cursor = conn.cursor()

    # видаляємо старі записи
    cursor.execute("""
        DELETE FROM dbo.student_analysis_weak_topics
        WHERE analysis_id = ?
    """, (analysis_id,))

    # вставляємо нові
    for w in weak_topics:
        cursor.execute("""
            INSERT INTO dbo.student_analysis_weak_topics(
                analysis_id,
                direction_name,
                subject_name,
                topic_name,
                topic_score
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            analysis_id,
            w["direction"],
            w["subject"],
            w["topic"],
            float(w["score"])
        ))

    conn.commit()
    cursor.close()
    conn.close()


# ============================================================
# 7. Головна функція
# ============================================================

def main():
    df_all = load_all_scores()

    df_student = df_all[df_all["student_id"] == TARGET_STUDENT_ID].copy()
    print(f"DEBUG: student_id={TARGET_STUDENT_ID}, всього записів до фільтра: {len(df_student)}")

    df_student = filter_student_scope(df_student)
    print(f"DEBUG: після filter_student_scope, записів: {len(df_student)}")

    if df_student.empty:
        print("Після застосування фільтра періоду для цього студента не залишилось результатів.")
        return

    if df_all.empty:
        print("У базі немає жодного завершеного тесту.")
        return

    # 1) Навчаємо глобальну модель на ВСІХ учнях
    model, scaler = train_global_model(df_all)

    # 2) Беремо одного цільового учня
    df_student = df_all[df_all["student_id"] == TARGET_STUDENT_ID].copy()

    if df_student.empty:
        print(f"Для студента ID={TARGET_STUDENT_ID} немає завершених тестів (state = 1).")
        return

    # 2.1) Фільтруємо за обраним періодом аналізу
    df_student = filter_student_scope(df_student)

    if df_student.empty:
        print("Після застосування фільтра періоду для цього студента не залишилось результатів.")
        return

    full_name = f"{df_student['last_name'].iloc[0]} " \
                f"{df_student['first_name'].iloc[0]} " \
                f"{df_student['patronymic_name'].iloc[0]}"

    print(f"\n=== ML-аналіз результатів студента: {full_name} (ID={TARGET_STUDENT_ID}) ===")
    print(f"Режим аналізу: {ANALYSIS_SCOPE}\n")

    # 3) Застосовуємо модель до цього учня
    df_student_pred = apply_model_to_student(df_student, model, scaler)

    # 4) Агрегація по напрямках + рекомендації + слабкі теми (структуровано)
    forecast_df, recs, weak_topics_struct = generate_direction_and_topic_recommendations(df_student_pred)

    print(">>> Зведена статистика за напрямками (історія vs прогноз):")
    for _, row in forecast_df.iterrows():
        print(
            f"- {row['direction']}: середній бал {row['avg_score']}, "
            f"тестів {int(row['tests_count'])}, "
            f"історичний рівень: {row['hist_level']}, "
            f"прогнозований рівень: {row['forecast_level_display']}"
        )

    print("\n>>> Персоналізовані рекомендації за напрямками, темами та можливими кар'єрними траєкторіями:")
    for r in recs:
        print("-", r)

    # ====================================================
    # ЗБЕРЕЖЕННЯ АНАЛІЗУ В БД
    # ====================================================

    # 1) формуємо основні текстові блоки
    main_profile_text = recs[0] if len(recs) > 0 else None
    career_text = recs[1] if len(recs) > 1 else None

    weak_directions_text = None
    worsening_subjects_text = None

    for r in recs[2:]:
        if "напрямах та темах" in r:
            weak_directions_text = r
        elif "Окремо слід звернути увагу на предмет(и)" in r:
            worsening_subjects_text = r

    # 2) визначаємо class_id для scope='current_class'
    class_id = None
    if ANALYSIS_SCOPE == "current_class":
        class_id, _, _ = get_current_class_period(TARGET_STUDENT_ID)

    # 3) вставляємо або оновлюємо запис у student_analysis
    analysis_id = upsert_student_analysis(
        TARGET_STUDENT_ID,
        ANALYSIS_SCOPE,
        class_id,
        main_profile_text,
        career_text,
        weak_directions_text,
        worsening_subjects_text
    )

    # 4) вставляємо дані по напрямках
    replace_analysis_directions(analysis_id, forecast_df)

    # 5) слабкі теми
    replace_analysis_weak_topics(analysis_id, weak_topics_struct)

    print(f"\n>>> Результати збережено в БД (analysis_id = {analysis_id})\n")

    df_student = df_all[df_all["student_id"] == TARGET_STUDENT_ID].copy()
    print(f"DEBUG: student_id={TARGET_STUDENT_ID}, всього записів до фільтра: {len(df_student)}")

    df_student = filter_student_scope(df_student)
    print(f"DEBUG: після filter_student_scope, записів: {len(df_student)}")

    if df_student.empty:
        print("Після застосування фільтра періоду для цього студента не залишилось результатів.")
        return


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        try:
            TARGET_STUDENT_ID = int(sys.argv[1])
        except ValueError:
            print(f"Некоректний student_id: {sys.argv[1]}")

    if len(sys.argv) >= 3:
        ANALYSIS_SCOPE = sys.argv[2]

    main()
