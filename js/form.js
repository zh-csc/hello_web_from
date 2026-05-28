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
  name: "测试姓名",
  gender: "男",
  idCard: "430000199901010000",
  birthDate: "1999-01-01",
  studentNo: "S20260001",
  enrollmentDate: "2026-09-01",
  graduationDate: "2031-06-30",
  admissionPhoto: "files/no-photo.png"
};

const PHOTO_RULES = {
  maxSize: 200 * 1024,
  width: 480,
  height: 640,
  ratio: 3 / 4
};

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

function formatStoredDate(value) {
  if (!value) return "";
  return value.includes("年")
    ? value.replace("年", "-").replace("月", "-").replace("日", "")
    : value;
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
    const fields = ["name", "gender", "idCard", "birthDate", "studentNo", "enrollmentDate", "graduationDate"];

    fields.forEach((field) => {
      if (form.elements[field] && profile[field]) {
        form.elements[field].value = formatStoredDate(profile[field]);
      }
    });

    if (profile.admissionPhoto) {
      const img = previewBox.querySelector("img");
      img.src = profile.admissionPhoto;
      previewBox.hidden = false;
    }

    return profile;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#profileForm");
  const idCardInput = form.elements.idCard;
  const birthDateInput = form.elements.birthDate;
  const photoInput = form.elements.admissionPhoto;
  const errorBox = document.querySelector("#formError");
  const previewBox = document.querySelector("#admissionPhotoPreview");
  let restoredProfile = null;

  fillFixedFields(form);
  fillDefaultFields(form);
  restoredProfile = restoreForm(form, previewBox);

  idCardInput.addEventListener("input", () => {
    birthDateInput.value = parseBirth(idCardInput.value.trim());
  });

  photoInput.addEventListener("change", async () => {
    errorBox.textContent = "";
    const file = photoInput.files[0];
    if (!file) return;

    try {
      await validateAdmissionPhoto(file);
      const preview = await fileToBase64(file);
      previewBox.querySelector("img").src = preview;
      previewBox.hidden = false;
    } catch (error) {
      previewBox.hidden = true;
      errorBox.textContent = String(error);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";

    const requiredFields = ["name", "gender", "idCard", "studentNo", "enrollmentDate", "graduationDate"];
    const missingField = requiredFields.find((field) => !form.elements[field].value.trim());

    if (missingField) {
      errorBox.textContent = "请完整填写必填信息";
      form.elements[missingField].focus();
      return;
    }

    const idCard = form.elements.idCard.value.trim();

    if (!/^\d{17}[\dXx]$/.test(idCard)) {
      errorBox.textContent = "证件号码格式不正确，请输入 18 位身份证号码";
      return;
    }

    const birthDate = parseBirth(idCard);

    if (!birthDate) {
      errorBox.textContent = "无法从证件号码解析出生日期";
      return;
    }

    try {
      const photoFile = photoInput.files[0];
      let admissionPhoto = restoredProfile?.admissionPhoto || defaultFormData.admissionPhoto;

      if (photoFile) {
        await validateAdmissionPhoto(photoFile);
        admissionPhoto = await fileToBase64(photoFile);
      }

      const profile = {
        ...fixedData,
        name: form.elements.name.value.trim(),
        gender: form.elements.gender.value,
        idCard,
        birthDate,
        studentNo: form.elements.studentNo.value.trim(),
        enrollmentDate: form.elements.enrollmentDate.value,
        graduationDate: form.elements.graduationDate.value,
        admissionPhoto
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      window.location.href = "preview.html";
    } catch (error) {
      errorBox.textContent = String(error);
    }
  });
});
