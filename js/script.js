// ===================================================================
// script.js (v6 - 수정 기능 버그 해결 및 코드 통합)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 설정 영역 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyb1C4ECIf8wtzDN-ZoZzPUjf0qP3Kfv6DKzcZX-6BMn0EBdS_vUcT6MJsBPMr8jV1KLA/exec';
    const API_KEY = 'GEM-PROJECT-GPH-2025';
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 설정 영역 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    // -------------------------------------------------------------------

    // --- 기본 요소 정의 ---
    const form = document.getElementById('consent-form');
    const submitBtn = document.getElementById('submit-btn');
    const loadingModal = document.getElementById('loading-modal');

    // --- 이메일 인증 관련 요소 ---
    const emailVerificationSection = document.getElementById('email-verification-section');
    const emailInput = document.getElementById('email');
    const sendVerificationBtn = document.getElementById('send-verification-btn');
    const verificationCodeGroup = document.getElementById('verification-code-group');
    const verificationCodeInput = document.getElementById('verification-code');
    const confirmVerificationBtn = document.getElementById('confirm-verification-btn');
    const emailStatusMsg = document.getElementById('email-status-msg');

    // --- 서명패드 관련 요소 ---
    const namePadCanvas = document.getElementById('name-pad');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearNameBtn = document.getElementById('clear-name');
    const clearSignatureBtn = document.getElementById('clear-signature');
    const signaturePreview = document.getElementById('signature-preview');

    // --- 수정 기능 관련 요소 ---
    const openEditModalBtn = document.getElementById('open-edit-modal-btn');
    const editRequestModal = document.getElementById('edit-request-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const requestEditLinkBtn = document.getElementById('request-edit-link-btn');
    const editEmailInput = document.getElementById('edit-email');
    const editPasswordInput = document.getElementById('edit-password-check');
    const editStatusMsg = document.getElementById('edit-status-msg');
    const originalEmailSection = document.getElementById('original-email-section');
    const originalEmailDisplay = document.getElementById('original-email-display');

    // --- 이미지 미리보기 요소 ---
    const contractImageInput = document.getElementById('contractImage');
    const contractPreview = document.getElementById('contract-preview');
    const nameChangeImageInput = document.getElementById('nameChangeImage');
    const nameChangePreview = document.getElementById('nameChange-preview');

    // --- 상태 변수 ---
    let isEmailVerified = false;
    let serverVerificationCode = '';
    let currentEditMode = false;
    let originalEmail = ''; // 수정 모드에서 원본 이메일 저장

    // --- 서명패드 초기화 ---
    if (typeof SignaturePad === 'undefined') {
        console.error('SignaturePad library not loaded!');
        return alert('서명 기능을 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.');
    }
    const resizeCanvas = (canvas) => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas(namePadCanvas);
    resizeCanvas(signaturePadCanvas);
    const namePad = new SignaturePad(namePadCanvas, { backgroundColor: 'rgb(255, 255, 255)', minWidth: 1, maxWidth: 2.5 });
    const signaturePad = new SignaturePad(signaturePadCanvas, { backgroundColor: 'rgb(255, 255, 255)', minWidth: 1, maxWidth: 2.5 });

    window.addEventListener('resize', () => {
        const nameData = namePad.toDataURL();
        const signatureData = signaturePad.toDataURL();
        resizeCanvas(namePadCanvas);
        resizeCanvas(signaturePadCanvas);
        namePad.fromDataURL(nameData);
        signaturePad.fromDataURL(signatureData);
    });

    // ===================================================================
    // 헬퍼 함수
    // ===================================================================

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], type: file.type, name: file.name });
        reader.onerror = error => reject(error);
    });

    const combinePads = (namePad, signaturePad) => new Promise((resolve, reject) => {
        const nameImage = new Image();
        const signatureImage = new Image();
        let loadedImages = 0;
        const onImageLoad = () => {
            if (++loadedImages === 2) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = nameImage.width + signatureImage.width;
                canvas.height = Math.max(nameImage.height, signatureImage.height);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(nameImage, 0, 0);
                ctx.drawImage(signatureImage, nameImage.width, 0);
                resolve(canvas.toDataURL('image/png'));
            }
        };
        nameImage.onload = signatureImage.onload = onImageLoad;
        nameImage.onerror = () => reject(new Error("이름 이미지 로딩 실패"));
        signatureImage.onerror = () => reject(new Error("서명 이미지 로딩 실패"));
        nameImage.src = namePad.toDataURL('image/png');
        signatureImage.src = signaturePad.toDataURL('image/png');
    });

    const setupImagePreview = (input, preview) => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log(`새 파일 선택됨: ${input.id}`, file.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.classList.remove('hidden');
                    preview.style.display = 'block'; // 숨겨진 상태에서 보이도록
                    console.log(`새 이미지 미리보기 설정 완료: ${input.id}`);
                };
                reader.readAsDataURL(file);
            } else {
                // 파일이 선택 취소된 경우, 기존 이미지를 다시 표시하거나 숨김
                console.log(`파일 선택 취소됨: ${input.id}`);
                // 수정 모드에서는 기존 이미지를 유지
                if (!currentEditMode) {
                    preview.classList.add('hidden');
                }
            }
        });
    };

    // ===================================================================
    // 수정 모드 데이터 처리
    // ===================================================================

    const populateForm = (data) => {
        console.log("폼 데이터 채우기 시작:", data);

        // 필수 요소들이 존재하는지 확인
        const requiredElements = {
            emailVerificationSection: emailVerificationSection,
            originalEmailDisplay: originalEmailDisplay,
            originalEmailSection: originalEmailSection,
            submitBtn: submitBtn
        };

        Object.entries(requiredElements).forEach(([name, element]) => {
            if (!element) {
                console.error(`Required element missing: ${name}`);
            } else {
                console.log(`Element found: ${name}`, element);
            }
        });

        originalEmail = data['이메일 주소'];
        console.log("설정된 originalEmail:", originalEmail);
        
        // --- 텍스트 필드 ---
        // 백엔드 데이터 키 확인을 위한 로그
        console.log("받은 데이터 키들:", Object.keys(data));

        // 여러 가능한 키 이름으로 시도
        const fullNameKeys = ['1. 성명 (계약서와 일치)', '1. 성명(계약서와 일치)', 'fullName'];
        const dongHoKeys = ['2. 동 호수', '2. 동호수', 'dongHo'];
        const dobKeys = ['3. 생년월일 (8자리)', '3. 생년월일(8자리)', 'dob'];
        const phoneKeys = ['4. 연락처', 'phone'];

        const findDataByKeys = (keys) => {
            for (let key of keys) {
                if (data[key] !== undefined && data[key] !== null) {
                    return data[key];
                }
            }
            return '';
        };

        document.getElementById('fullName').value = findDataByKeys(fullNameKeys);
        document.getElementById('dongHo').value = findDataByKeys(dongHoKeys);
        document.getElementById('dob').value = findDataByKeys(dobKeys);
        document.getElementById('phone').value = findDataByKeys(phoneKeys);

        console.log("바인딩된 값들:", {
            fullName: document.getElementById('fullName').value,
            dongHo: document.getElementById('dongHo').value,
            dob: document.getElementById('dob').value,
            phone: document.getElementById('phone').value
        });
        const editPasswordField = document.getElementById('editPassword');
        editPasswordField.placeholder = '새 비밀번호 입력 시에만 변경됩니다';
        editPasswordField.required = false;

        // --- 라디오 및 체크박스 ---
        const checkRadio = (name, value) => {
            const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (el) el.checked = true;
        };
        checkRadio('isContractor', data['1-1. 본 설문을 작성하시는 분은 계약자 본인이십니까?']);
        checkRadio('agreeTermsRadio', data['6. 위임 내용'] === '동의합니다' ? 'agree' : 'disagree');
        checkRadio('agreeMarketingRadio', data['9. 홍보 및 소식 전달을 위한 개인정보 수집·이용 동의 (선택)'] === '동의합니다' ? 'agree' : 'disagree');

        document.getElementById('agreePrivacy').checked = data['7. 개인정보 수집 및 이용 동의'] === '동의합니다';
        document.getElementById('agreeProvider').checked = data['8. 개인정보 제3자 제공 동의'] === '동의합니다';
        
        // --- 기존 이미지 미리보기 ---
        const setImagePreview = (imgElement, url, fallbackText) => {
            if (url && url.trim() !== '') {
                console.log(`이미지 로드 시도: ${fallbackText}`, url);

                // Google Drive 공유 URL을 직접 이미지 URL로 변환
                let imageUrl = url;
                if (url.includes('drive.google.com')) {
                    // Google Drive 파일 ID 추출
                    const fileId = url.match(/[-\w]{25,}/);
                    if (fileId) {
                        imageUrl = `https://drive.google.com/thumbnail?id=${fileId[0]}&sz=w500`;
                    }
                }

                imgElement.src = imageUrl;
                imgElement.classList.remove('hidden');

                // 이미지 로드 실패 시 처리
                imgElement.onerror = () => {
                    console.warn(`이미지 로드 실패: ${fallbackText}`, url);
                    imgElement.style.display = 'none';
                };

                imgElement.onload = () => {
                    console.log(`이미지 로드 성공: ${fallbackText}`);
                };
            } else {
                console.log(`이미지 URL 없음: ${fallbackText}`);
            }
        };

        // 이미지 키들도 여러 가능성으로 시도
        const contractImageKeys = ['5. 계약서 사진첨부', '5. 계약서 사진 첨부', 'contractImage'];
        const signatureImageKeys = [
            '10. 위 모든 약관에 동의한다는 자필 성명과 서명을 사진 첨부 부탁드립니다.',
            '10. 자필 성명과 서명',
            'signatureImage'
        ];
        const nameChangeImageKeys = [
            '11. (선택) 명의변경 등의 변경 내역 확인 필요 시 사진 첨부',
            '11. (선택) 명의변경 등',
            'nameChangeImage'
        ];

        setImagePreview(contractPreview, findDataByKeys(contractImageKeys), '계약서 사진');
        setImagePreview(signaturePreview, findDataByKeys(signatureImageKeys), '서명 이미지');
        setImagePreview(nameChangePreview, findDataByKeys(nameChangeImageKeys), '명의변경 사진');

        // --- UI 변경 ---
        emailVerificationSection.classList.add('hidden');
        originalEmailDisplay.textContent = originalEmail;
        originalEmailSection.classList.remove('hidden');

        // 수정 모드에서는 이메일 필드에 원본 이메일을 설정하고 readOnly로 만듦
        emailInput.value = originalEmail;
        emailInput.readOnly = true;

        isEmailVerified = true;
        submitBtn.disabled = false;
        submitBtn.textContent = '수정 완료하기';
        document.querySelector('header h1').textContent = '동의서 내용 수정';
        openEditModalBtn.classList.add('hidden');
    };

    // ===================================================================
    // 이벤트 리스너
    // ===================================================================

    // --- 이메일 인증 ---
    sendVerificationBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return alert('유효한 이메일 주소를 입력해주세요.');
        }
        sendVerificationBtn.disabled = true;
        sendVerificationBtn.textContent = '발송 중...';
        emailStatusMsg.textContent = '';
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ apiKey: API_KEY, action: 'sendVerificationEmail', email })
            });
            const result = await response.json();
            if (result.status === 'success') {
                serverVerificationCode = result.verificationCode;
                verificationCodeGroup.classList.remove('hidden');
                emailStatusMsg.textContent = '입력하신 이메일로 인증번호를 발송했습니다.';
                emailStatusMsg.className = 'status-msg';
            } else {
                throw new Error(result.message || '인증번호 발송 실패');
            }
        } catch (error) {
            emailStatusMsg.textContent = `오류: ${error.message}`;
            emailStatusMsg.className = 'status-msg error';
        } finally {
            sendVerificationBtn.disabled = false;
            sendVerificationBtn.textContent = '인증번호 발송';
        }
    });

    confirmVerificationBtn.addEventListener('click', () => {
        if (verificationCodeInput.value.trim() === serverVerificationCode && serverVerificationCode) {
            isEmailVerified = true;
            emailStatusMsg.textContent = '✅ 이메일 인증이 완료되었습니다.';
            emailStatusMsg.className = 'status-msg success';

            // disabled 대신 readonly를 사용하여 FormData에서 값이 제외되지 않도록 함
            emailInput.readOnly = true;
            verificationCodeInput.readOnly = true;
            [sendVerificationBtn, confirmVerificationBtn].forEach(el => el.disabled = true);

            submitBtn.disabled = false;
        } else {
            isEmailVerified = false;
            emailStatusMsg.textContent = '인증번호가 일치하지 않습니다.';
            emailStatusMsg.className = 'status-msg error';
            submitBtn.disabled = true;
        }
    });

    // --- 수정 모달 ---
    openEditModalBtn.addEventListener('click', () => editRequestModal.classList.remove('hidden'));
    closeEditModalBtn.addEventListener('click', () => editRequestModal.classList.add('hidden'));
    requestEditLinkBtn.addEventListener('click', async () => {
        const email = editEmailInput.value;
        const password = editPasswordInput.value;
        if (!email || !password) return alert('이메일과 비밀번호를 모두 입력해주세요.');
        
        requestEditLinkBtn.disabled = true;
        requestEditLinkBtn.textContent = '요청 중...';
        editStatusMsg.textContent = '';
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ apiKey: API_KEY, action: 'requestEditLink', email, editPassword: password })
            });
            const result = await response.json();
            editStatusMsg.className = result.status === 'success' ? 'status-msg success' : 'status-msg error';
            editStatusMsg.textContent = result.message;
        } catch(e) {
            editStatusMsg.className = 'status-msg error';
            editStatusMsg.textContent = '오류가 발생했습니다: ' + e.message;
        } finally {
            requestEditLinkBtn.disabled = false;
            requestEditLinkBtn.textContent = '수정 링크 요청';
        }
    });

    // --- 서명패드 및 이미지 미리보기 ---
    clearNameBtn.addEventListener('click', () => {
        namePad.clear();
        console.log('이름 패드 지우기');
    });

    clearSignatureBtn.addEventListener('click', () => {
        signaturePad.clear();
        console.log('서명 패드 지우기');

        // 수정 모드에서 서명을 지웠을 때 기존 서명 이미지 다시 표시
        if (currentEditMode && signaturePreview && signaturePreview.src) {
            signaturePreview.classList.remove('hidden');
            signaturePreview.style.display = 'block';
        }
    });
    setupImagePreview(contractImageInput, contractPreview);
    setupImagePreview(nameChangeImageInput, nameChangePreview);

    // --- 폼 제출 처리 ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isEmailVerified) return alert('이메일 인증을 먼저 완료해주세요.');

        // 필수 필드 유효성 검사 (신규 제출 시에만 엄격하게)
        if (!currentEditMode) {
             const requiredFields = { fullName: "성명", dongHo: "동호수", dob: "생년월일", phone: "연락처", editPassword: "수정용 비밀번호" };
             for (const [id, name] of Object.entries(requiredFields)) {
                 if (!document.getElementById(id).value) return alert(`필수 항목을 입력해주세요: ${name}`);
             }
             if (!contractImageInput.files[0]) return alert("필수 항목을 첨부해주세요: 계약서 사진");
             if (namePad.isEmpty() || signaturePad.isEmpty()) return alert("필수 항목을 입력해주세요: 이름(정자체)과 서명");
        }

        loadingModal.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            // FormData 생성 (readonly 필드도 포함됨)
            const formData = Object.fromEntries(new FormData(form).entries());

            // 이메일 값이 누락된 경우 수동으로 추가 (일반 모드)
            if (!formData.email && emailInput.value) {
                formData.email = emailInput.value;
                console.log('이메일 값 수동 추가:', emailInput.value);
            }

            // 수정 모드에서 originalEmail을 사용하도록 명시적으로 처리
            if (currentEditMode && originalEmail) {
                formData.email = originalEmail;
                console.log('수정 모드: originalEmail을 formData.email로 설정:', originalEmail);
            }

            // 이메일 input 상태 디버깅
            console.log('이메일 input의 현재 값:', emailInput.value);
            console.log('이메일 input의 readOnly 상태:', emailInput.readOnly);

            // FormData 디버깅 로그
            console.log('생성된 FormData:', formData);
            console.log('이메일 값 확인:', formData.email);
            let combinedSignatureObject = null;
            if (!namePad.isEmpty() && !signaturePad.isEmpty()) {
                const dataUrl = await combinePads(namePad, signaturePad);
                combinedSignatureObject = { base64: dataUrl.split(',')[1], type: 'image/png', name: 'combined_signature.png' };
            }
            
            const dataToSend = {
                ...formData,
                // 수정 모드에서는 originalEmail을 사용하되, 백엔드가 email 필드를 기대하므로 email로도 설정
                email: currentEditMode ? originalEmail : formData.email,
                originalEmail: currentEditMode ? originalEmail : formData.email,
                contractImageFile: await fileToBase64(contractImageInput.files[0]),
                nameChangeImageFile: await fileToBase64(nameChangeImageInput.files[0]),
                combinedSignature: combinedSignatureObject,
            };

            console.log('백엔드 전송 데이터:', {
                action: currentEditMode ? 'updateForm' : 'submitForm',
                email: dataToSend.email,
                fullName: dataToSend.fullName,
                dongHo: dataToSend.dongHo,
                hasContractImage: !!dataToSend.contractImageFile,
                hasCombinedSignature: !!dataToSend.combinedSignature
            });

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ 
                    apiKey: API_KEY, 
                    action: currentEditMode ? 'updateForm' : 'submitForm',
                    formData: dataToSend 
                })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                window.location.href = window.location.pathname; // 페이지 새로고침
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert('오류가 발생했습니다: ' + error.message);
            submitBtn.disabled = false;
        } finally {
            loadingModal.classList.add('hidden');
        }
    });

    // ===================================================================
    // ✨ 페이지 초기화 (메인 로직) ✨
    // ===================================================================
    const initializePage = async () => {
        console.log("페이지 로드 완료. 수정 토큰을 확인합니다...");
        console.log("현재 URL:", window.location.href);
        console.log("Search params:", window.location.search);

        submitBtn.disabled = true; // 기본적으로 제출 버튼 비활성화

        const params = new URLSearchParams(window.location.search);
        const editToken = params.get('editToken');

        console.log("추출된 editToken:", editToken);
        console.log("editToken 존재 여부:", !!editToken);

        if (editToken) {
            console.log("수정 토큰 발견:", editToken);
            currentEditMode = true;
            loadingModal.classList.remove('hidden');
            try {
                console.log("GAS 백엔드에 수정 데이터 요청 중...");
                const requestBody = { apiKey: API_KEY, action: 'getEditData', token: editToken };
                console.log("Request body:", requestBody);

                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify(requestBody)
                });

                console.log("GAS 응답 상태:", response.status);
                console.log("GAS 응답 헤더:", response.headers);

                const result = await response.json();
                console.log("GAS 응답 결과:", result);

                if (result.status !== 'success') throw new Error(result.message);

                console.log("폼 데이터로 채우기 시작...");
                populateForm(result.data);

            } catch (e) {
                console.error('수정 데이터 로딩 중 오류:', e);
                console.error('오류 스택:', e.stack);
                alert('데이터 로딩 실패: ' + e.message);
                window.location.href = window.location.pathname; // 실패 시 URL 초기화
            } finally {
                loadingModal.classList.add('hidden');
            }
        } else {
            console.log("수정 토큰 없음. 일반 제출 모드로 시작합니다.");
            // 일반 모드에서는 이메일 인증 후 제출 버튼 활성화
        }
    };

    // --- 페이지 초기화 함수 실행 ---
    initializePage();
});