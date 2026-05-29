const STORAGE_KEY = "studentProfile";

const fixedData = {
  school: "湖南农业大学",
  educationLevel: "本科",
  major: "动物医学",
  studyType: "普通全日制",
  nation: "汉族",
  duration: "5年",
  college: "动物医学院",
  department: "动物医学系",
  className: "动物医学2301班",
  studentStatus: "在籍",
  educationPhoto: "files/no-photo.png"
};

const defaultFormData = {
  name: "李宁",
  gender: "女",
  idCard: "110105200104283420",
  birthDate: "2001-04-28",
  className: "动物医学2201班",
  studentNo: "S20220001",
  enrollmentDate: "2022-09-01",
  graduationDate: "2026-06-30",
  admissionPhoto: "files/test_480x640.jpg"
};

const PHOTO_RULES = {
  maxSize: 200 * 1024,
  width: 480,
  height: 640,
  ratio: 3 / 4
};

const writableFields = ["name", "gender", "idCard", "birthDate", "className", "studentNo", "enrollmentDate", "graduationDate"];
const requiredFields = ["name", "gender", "idCard", "className", "studentNo", "enrollmentDate", "graduationDate"];
const exportFileName = "student-profile.txt";

function isMobileWeChat() {
  const userAgent = navigator.userAgent || "";
  return /MicroMessenger/i.test(userAgent) && /Android|iPhone|iPad|iPod/i.test(userAgent);
}

function parseBirth(idCard) {
  if (!/^\d{17}[\dXx]$/.test(idCard)) return "";

  const birth = idCard.slice(6, 14);
  const year = birth.slice(0, 4);
  const month = birth.slice(4, 6);
  const day = birth.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function validateAdmissionPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("请上传录取照片");
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      reject("照片格式不符合要求：仅支持 JPG、JPEG、PNG");
      return;
    }

    if (file.size > PHOTO_RULES.maxSize) {
      reject("照片大小不符合要求：请上传不超过 200KB 的图片");
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const ratio = width / height;

      URL.revokeObjectURL(objectUrl);

      if (width !== PHOTO_RULES.width || height !== PHOTO_RULES.height) {
        reject(`照片像素不符合要求：请上传 ${PHOTO_RULES.width} × ${PHOTO_RULES.height} 像素的图片`);
        return;
      }

      if (Math.abs(ratio - PHOTO_RULES.ratio) > 0.01) {
        reject("照片比例不符合要求：请上传 3:4 比例的图片");
        return;
      }

      resolve();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject("照片读取失败，请重新上传");
    };

    img.src = objectUrl;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject("照片转换失败，请重新上传");

    reader.readAsDataURL(file);
  });
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject("文件读取失败，请重新选择");

    reader.readAsText(file, "UTF-8");
  });
}

function formatStoredDate(value) {
  if (!value) return "";
  return value.includes("年")
    ? value.replace("年", "-").replace("月", "-").replace("日", "")
    : value;
}

function updatePhotoPreview(previewBox, src) {
  if (!src) {
    previewBox.hidden = true;
    previewBox.querySelector("img").removeAttribute("src");
    return;
  }

  previewBox.querySelector("img").src = src;
  previewBox.hidden = false;
}

function fillFixedFields(form) {
  Object.entries(fixedData).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function fillDefaultFields(form) {
  Object.entries(defaultFormData).forEach(([key, value]) => {
    if (key !== "admissionPhoto" && form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function restoreForm(form, previewBox) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const profile = JSON.parse(raw);
    applyProfileToForm(form, previewBox, profile);

    return profile;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function applyProfileToForm(form, previewBox, profile) {
  writableFields.forEach((field) => {
    if (form.elements[field] && profile[field]) {
      form.elements[field].value = formatStoredDate(profile[field]);
    }
  });

  if (form.elements.idCard) {
    form.elements.birthDate.value = parseBirth(form.elements.idCard.value.trim()) || form.elements.birthDate.value;
  }

  updatePhotoPreview(previewBox, profile.admissionPhoto);
}

function validateProfileData(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("导入文件格式错误：未找到有效表单数据");
  }

  const missingField = requiredFields.find((field) => !String(profile[field] || "").trim());

  if (missingField) {
    throw new Error("导入文件格式错误：缺少必要字段");
  }

  if (!["男", "女"].includes(profile.gender)) {
    throw new Error("导入文件格式错误：性别只能为男或女");
  }

  if (!/^\d{17}[\dXx]$/.test(profile.idCard)) {
    throw new Error("导入文件格式错误：证件号码格式不正确");
  }

  const birthDate = parseBirth(profile.idCard);

  if (!birthDate) {
    throw new Error("导入文件格式错误：无法从证件号码解析出生日期");
  }

  return {
    ...fixedData,
    name: String(profile.name).trim(),
    gender: profile.gender,
    idCard: String(profile.idCard).trim(),
    birthDate,
    className: String(profile.className || fixedData.className).trim(),
    studentNo: String(profile.studentNo).trim(),
    enrollmentDate: formatStoredDate(profile.enrollmentDate),
    graduationDate: formatStoredDate(profile.graduationDate),
    admissionPhoto: profile.admissionPhoto || defaultFormData.admissionPhoto
  };
}

async function buildProfileFromForm(form, photoInput, restoredProfile) {
  const missingField = requiredFields.find((field) => !form.elements[field].value.trim());

  if (missingField) {
    form.elements[missingField].focus();
    throw new Error("请完整填写必填信息");
  }

  const idCard = form.elements.idCard.value.trim();

  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    throw new Error("证件号码格式不正确，请输入 18 位身份证号码");
  }

  const birthDate = parseBirth(idCard);

  if (!birthDate) {
    throw new Error("无法从证件号码解析出生日期");
  }

  const photoFile = photoInput.files[0];
  let admissionPhoto = restoredProfile?.admissionPhoto || defaultFormData.admissionPhoto;

  if (photoFile) {
    await validateAdmissionPhoto(photoFile);
    admissionPhoto = await fileToBase64(photoFile);
  }

  return {
    ...fixedData,
    name: form.elements.name.value.trim(),
    gender: form.elements.gender.value,
    idCard,
    birthDate,
    className: form.elements.className.value.trim(),
    studentNo: form.elements.studentNo.value.trim(),
    enrollmentDate: form.elements.enrollmentDate.value,
    graduationDate: form.elements.graduationDate.value,
    admissionPhoto
  };
}

function downloadProfile(profile) {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = exportFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function serializeProfile(profile) {
  return JSON.stringify(profile, null, 2);
}

function importProfileText(text) {
  return validateProfileData(JSON.parse(text));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function focusTransferText(transferText) {
  try {
    transferText.focus();
    transferText.select();
  } catch (error) {
    // Some mobile WebViews reject programmatic selection; manual copy still works.
  }
}

function showError(errorBox, message) {
  errorBox.classList.remove("success");
  errorBox.textContent = message;
}

function showSuccess(errorBox, message) {
  errorBox.classList.add("success");
  errorBox.textContent = message;
}

function clearMessage(errorBox) {
  errorBox.classList.remove("success");
  errorBox.textContent = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#profileForm");
  const idCardInput = form.elements.idCard;
  const birthDateInput = form.elements.birthDate;
  const photoInput = form.elements.admissionPhoto;
  const importInput = document.querySelector("#importFile");
  const importButton = document.querySelector("#importButton");
  const exportButton = document.querySelector("#exportButton");
  const wechatTransferPanel = document.querySelector("#wechatTransferPanel");
  const transferText = document.querySelector("#transferText");
  const copyTransferButton = document.querySelector("#copyTransferButton");
  const pasteImportButton = document.querySelector("#pasteImportButton");
  const errorBox = document.querySelector("#formError");
  const previewBox = document.querySelector("#admissionPhotoPreview");
  let restoredProfile = null;
  const useWechatFallback = isMobileWeChat();

  fillFixedFields(form);
  fillDefaultFields(form);
  restoredProfile = restoreForm(form, previewBox);

  if (!restoredProfile) {
    updatePhotoPreview(previewBox, defaultFormData.admissionPhoto);
  }

  if (useWechatFallback) {
    importInput.hidden = true;
    wechatTransferPanel.hidden = false;
  }

  idCardInput.addEventListener("input", () => {
    birthDateInput.value = parseBirth(idCardInput.value.trim());
  });

  photoInput.addEventListener("change", async () => {
    clearMessage(errorBox);
    const file = photoInput.files[0];
    if (!file) return;

    try {
      await validateAdmissionPhoto(file);
      const preview = await fileToBase64(file);
      updatePhotoPreview(previewBox, preview);
    } catch (error) {
      updatePhotoPreview(previewBox, "");
      showError(errorBox, String(error));
    }
  });

  importButton.addEventListener("click", () => {
    if (useWechatFallback) {
      wechatTransferPanel.hidden = false;
      focusTransferText(transferText);
      showError(errorBox, "微信内置浏览器请将 TXT 内容粘贴到下方文本框后导入");
      return;
    }

    importInput.click();
  });

  importInput.addEventListener("change", async () => {
    clearMessage(errorBox);
    const file = importInput.files[0];

    if (!file) return;

    try {
      const content = await readTextFile(file);
      const profile = importProfileText(content);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      restoredProfile = profile;
      photoInput.value = "";
      applyProfileToForm(form, previewBox, profile);
      showSuccess(errorBox, "导入成功");
    } catch (error) {
      showError(errorBox, error instanceof SyntaxError
        ? "导入文件格式错误：请导入有效的 TXT 数据文件"
        : String(error.message || error));
    } finally {
      importInput.value = "";
    }
  });

  pasteImportButton.addEventListener("click", () => {
    clearMessage(errorBox);

    try {
      const profile = importProfileText(transferText.value.trim());

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      restoredProfile = profile;
      photoInput.value = "";
      applyProfileToForm(form, previewBox, profile);
      showSuccess(errorBox, "导入成功");
    } catch (error) {
      showError(errorBox, error instanceof SyntaxError
        ? "导入文件格式错误：请粘贴有效的 TXT 数据内容"
        : String(error.message || error));
    }
  });

  copyTransferButton.addEventListener("click", async () => {
    clearMessage(errorBox);

    try {
      if (!transferText.value.trim()) {
        const profile = await buildProfileFromForm(form, photoInput, restoredProfile);
        transferText.value = serializeProfile(profile);
      }

      await copyText(transferText.value);
      showSuccess(errorBox, "已复制导出内容");
    } catch (error) {
      showError(errorBox, "复制失败，请长按文本框手动复制");
    }
  });

  exportButton.addEventListener("click", async () => {
    clearMessage(errorBox);

    try {
      const profile = await buildProfileFromForm(form, photoInput, restoredProfile);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      restoredProfile = profile;

      if (useWechatFallback) {
        wechatTransferPanel.hidden = false;
        transferText.value = serializeProfile(profile);
        focusTransferText(transferText);
        showSuccess(errorBox, "已生成导出内容，请复制保存为 TXT");
        return;
      }

      downloadProfile(profile);
    } catch (error) {
      showError(errorBox, String(error.message || error));
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(errorBox);

    try {
      const profile = await buildProfileFromForm(form, photoInput, restoredProfile);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      window.location.href = "preview.html";
    } catch (error) {
      showError(errorBox, String(error.message || error));
    }
  });
});
