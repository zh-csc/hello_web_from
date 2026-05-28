const STORAGE_KEY = "studentProfile";

function formatChineseDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}年${month}月${day}日`;
}

document.addEventListener("DOMContentLoaded", () => {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    alert("未找到表单数据，请先填写表单");
    window.location.href = "index.html";
    return;
  }

  let profile;

  try {
    profile = JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    alert("表单数据读取失败，请重新填写");
    window.location.href = "index.html";
    return;
  }

  const viewModel = {
    ...profile,
    birthDateText: formatChineseDate(profile.birthDate),
    enrollmentDateText: formatChineseDate(profile.enrollmentDate),
    graduationDateText: formatChineseDate(profile.graduationDate),
    summaryText: `${profile.gender || ""}　${formatChineseDate(profile.birthDate)}`,
    majorStudyText: `${profile.major || ""}　| ${profile.studyType || ""}`
  };

  document.querySelectorAll("[data-field]").forEach((element) => {
    const field = element.dataset.field;
    element.textContent = viewModel[field] || "";
  });

  document.querySelectorAll("[data-field-img]").forEach((element) => {
    const field = element.dataset.fieldImg;
    if (viewModel[field]) {
      element.src = viewModel[field];
    }
  });
});
