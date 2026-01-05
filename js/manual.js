// ===================================================================
// manual.js - 오프라인 동의서 수기 입력 시스템 (관리자용)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 설정 영역 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    // ===================================================================
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzJrVSxSbv5ZYwV201yZlmojmvZ8CeBpLmWL1uQFXE0moezHS1tUXuSbU8-toLtV1llXQ/exec';
    const API_KEY = 'GEM-PROJECT-GPH-2025';
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 설정 영역 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    // ===================================================================

    // DOM 요소 참조
    const form = document.getElementById('manual-consent-form');
    const submitBtn = document.getElementById('manual-submit-btn');
    const loadingModal = document.getElementById('manual-loading-modal');

    // 입력 필드
    const nameInput = document.getElementById('manual-name');
    const dongInput = document.getElementById('manual-dong');
    const hoInput = document.getElementById('manual-ho');
    const dobInput = document.getElementById('manual-dob');
    const phoneInput = document.getElementById('manual-phone');
    const emailInput = document.getElementById('manual-email');

    // 파일 입력 및 미리보기
    const contractInput = document.getElementById('manual-contract');
    const contractPreview = document.getElementById('contract-preview');
    const namechangeInput = document.getElementById('manual-namechange');
    const namechangePreview = document.getElementById('namechange-preview');

    // ===================================================================
    // 헬퍼 함수: 파일을 Base64 JSON 객체로 변환
    // ===================================================================
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve(null);

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
            // data:image/jpeg;base64,... 형식에서 base64 부분만 추출
            const dataUrl = reader.result;
            const base64Data = dataUrl.split(',')[1];

            // 백엔드 API 규격에 맞춘 JSON 객체 생성
            resolve({
                base64: base64Data,
                type: file.type,
                name: file.name
            });
        };

        reader.onerror = error => {
            console.error('파일 읽기 실패:', error);
            reject(error);
        };
    });

    // ===================================================================
    // 이미지 미리보기 설정
    // ===================================================================
    const setupImagePreview = (inputElement, previewElement) => {
        inputElement.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewElement.src = event.target.result;
                    previewElement.classList.remove('hidden');
                    previewElement.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                previewElement.classList.add('hidden');
                previewElement.style.display = 'none';
            }
        });
    };

    // 미리보기 초기화
    setupImagePreview(contractInput, contractPreview);
    setupImagePreview(namechangeInput, namechangePreview);

    // ===================================================================
    // 폼 유효성 검사
    // ===================================================================
    const validateForm = () => {
        const errors = [];

        // 필수 텍스트 필드 검사
        if (!nameInput.value.trim()) {
            errors.push('성명을 입력해주세요.');
        }

        if (!dongInput.value.trim()) {
            errors.push('동 번호를 입력해주세요.');
        }

        if (!hoInput.value.trim()) {
            errors.push('호수를 입력해주세요.');
        }

        // 생년월일 검사 (8자리 숫자)
        const dob = dobInput.value.trim();
        if (!dob) {
            errors.push('생년월일을 입력해주세요.');
        } else if (!/^\d{8}$/.test(dob)) {
            errors.push('생년월일은 8자리 숫자로 입력해주세요. (예: 19900101)');
        }

        // 연락처 검사 (숫자만)
        const phone = phoneInput.value.trim();
        if (!phone) {
            errors.push('연락처를 입력해주세요.');
        } else if (!/^\d{10,11}$/.test(phone)) {
            errors.push('연락처는 10-11자리 숫자로 입력해주세요.');
        }

        // 이메일 검사
        const email = emailInput.value.trim();
        if (!email) {
            errors.push('이메일 주소를 입력해주세요.');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('유효한 이메일 주소를 입력해주세요.');
        }

        // 위임 동의 라디오 버튼 검사
        const delegation = document.querySelector('input[name="delegation"]:checked');
        if (!delegation) {
            errors.push('위임 동의 여부를 선택해주세요.');
        }

        // 파일 첨부 검사
        if (!contractInput.files || !contractInput.files[0]) {
            errors.push('계약서 사진을 첨부해주세요.');
        }

        // 명의변경 사진은 선택값이므로 검사하지 않음

        return errors;
    };

    // ===================================================================
    // 로딩 모달 제어
    // ===================================================================
    const showLoading = () => {
        loadingModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    };

    const hideLoading = () => {
        loadingModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    };

    // ===================================================================
    // 폼 제출 처리
    // ===================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 중복 제출 방지
        if (submitBtn.disabled) {
            console.log('이미 제출 중입니다. 중복 제출 방지.');
            return;
        }

        // 유효성 검사
        const errors = validateForm();
        if (errors.length > 0) {
            alert('입력 오류:\n\n' + errors.join('\n'));
            return;
        }

        // 버튼 비활성화 및 로딩 표시
        submitBtn.disabled = true;
        submitBtn.textContent = '제출 중...';
        showLoading();

        try {
            // 라디오 버튼 값 수집
            const delegation = document.querySelector('input[name="delegation"]:checked');
            const marketing = document.querySelector('input[name="marketing"]:checked');

            // 이미지 파일을 Base64 JSON 객체로 변환
            const contractImageBase64 = await fileToBase64(contractInput.files[0]);
            const namechangeImageBase64 = await fileToBase64(namechangeInput.files[0]);

            // 동호수 조합 (예: "109동 603호")
            const combinedDongHo = `${dongInput.value.trim()}동 ${hoInput.value.trim()}호`;

            // 백엔드 API 규격에 맞춘 데이터 구조 생성
            const payload = {
                apiKey: API_KEY,
                action: 'submitManualForm', // ★★★ 중요: 반드시 이 값이어야 함
                formData: {
                    name: nameInput.value.trim(),
                    dongho: combinedDongHo,
                    dob: dobInput.value.trim(),
                    phone: "'" + phoneInput.value.trim(), // ★ 문자열 강제 변환 (작은따옴표 prefix)
                    delegation: delegation ? delegation.value : '',
                    email: emailInput.value.trim(),
                    marketing: marketing ? marketing.value : '동의하지 않습니다',
                    // ★ JSON 문자열로 변환하여 전송 (Google Sheets에서 올바르게 저장되도록)
                    contractImageBase64: contractImageBase64 ? JSON.stringify(contractImageBase64) : null,
                    namechangeImageBase64: namechangeImageBase64 ? JSON.stringify(namechangeImageBase64) : null
                }
            };

            console.log('백엔드 전송 데이터:', {
                action: payload.action,
                name: payload.formData.name,
                dongho: payload.formData.dongho,
                hasContractImage: !!payload.formData.contractImageBase64,
                hasNamechangeImage: !!payload.formData.namechangeImageBase64
            });

            // 백엔드 API 호출
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });

            // 응답 처리
            const result = await response.json();
            console.log('백엔드 응답:', result);

            if (result.status === 'success') {
                alert('✅ 제출이 완료되었습니다!\n\n' + (result.message || '데이터가 성공적으로 저장되었습니다.'));

                // 폼 초기화
                form.reset();
                contractPreview.classList.add('hidden');
                namechangePreview.classList.add('hidden');
                contractPreview.src = '';
                namechangePreview.src = '';

                // 페이지 새로고침 (선택사항)
                window.location.reload();
            } else {
                throw new Error(result.message || '제출 중 오류가 발생했습니다.');
            }

        } catch (error) {
            console.error('제출 오류:', error);
            alert('❌ 제출 실패\n\n' + error.message + '\n\n다시 시도해주세요.');
        } finally {
            // 버튼 재활성화 및 로딩 숨김
            submitBtn.disabled = false;
            submitBtn.textContent = '제출하기';
            hideLoading();
        }
    });

    // ===================================================================
    // 생년월일 입력 필드 자동 포맷팅 (선택사항)
    // ===================================================================
    dobInput.addEventListener('input', (e) => {
        // 숫자만 입력 허용
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // ===================================================================
    // 연락처 입력 필드 자동 포맷팅 (선택사항)
    // ===================================================================
    phoneInput.addEventListener('input', (e) => {
        // 숫자만 입력 허용
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // ===================================================================
    // 동/호 입력 필드 숫자만 허용
    // ===================================================================
    dongInput.addEventListener('input', (e) => {
        // 숫자만 입력 허용
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    hoInput.addEventListener('input', (e) => {
        // 숫자만 입력 허용
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    console.log('✅ manual.js 초기화 완료');
});
