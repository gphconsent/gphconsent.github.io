// ===================================================================
// script.js (v6 - 수정 기능 버그 해결 및 코드 통합)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 설정 영역 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwv3aJTa5dyQVkzpIfLzcmkTuHLeX2jGg-xRBWpO7A_2toOEKg1Rmt_XhSz4S8vVPyxPw/exec';
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

    // --- 서명패드 관련 요소 (모달 기반) ---
    const signatureTriggerArea = document.getElementById('signature-trigger-area');
    const signatureModalOverlay = document.getElementById('signature-modal-overlay');
    const modalNameCanvas = document.getElementById('modal-name-pad');
    const modalSignatureCanvas = document.getElementById('modal-signature-pad');
    const nameModalClearBtn = document.getElementById('name-modal-clear');
    const signatureModalClearBtn = document.getElementById('signature-modal-clear');
    const signatureModalSaveBtn = document.getElementById('signature-modal-save');
    const signatureModalCancelBtn = document.getElementById('signature-modal-cancel');
    const signatureResultImg = document.getElementById('signature-result-img');
    const signaturePlaceholderText = document.getElementById('signature-placeholder-text');
    const signatureDataUrlInput = document.getElementById('signature-data-url');
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

    // 텍스트 선택 방지를 위한 이벤트 처리 함수
    const preventTextSelection = (canvas) => {
        // 컨텍스트 메뉴 방지 (우클릭/길게 누르기 메뉴)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // 텍스트 선택 시작 방지
        canvas.addEventListener('selectstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // 드래그 시작 방지
        canvas.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // iOS Safari 돋보기 및 길게 누르기 방지
        canvas.addEventListener('touchstart', (e) => {
            // 길게 누르기 방지를 위한 터치 이벤트 처리
            e.stopPropagation();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.stopPropagation();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: false });

        // iOS 웹킷 전용 이벤트 차단
        canvas.addEventListener('webkitmouseforcedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        canvas.addEventListener('webkitmouseforceup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    };

    // 모달 서명 패드 변수
    let modalNamePad, modalSignaturePad;
    let currentSignatureData = null;

    const initializeModalSignaturePads = () => {
        if (!modalNameCanvas || !modalSignatureCanvas) return;

        resizeCanvas(modalNameCanvas);
        resizeCanvas(modalSignatureCanvas);

        modalNamePad = new SignaturePad(modalNameCanvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            minWidth: 1,
            maxWidth: 2.5
        });
        modalSignaturePad = new SignaturePad(modalSignatureCanvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            minWidth: 1,
            maxWidth: 2.5
        });

        // 서명 패드에 텍스트 선택 방지 적용
        preventTextSelection(modalNameCanvas);
        preventTextSelection(modalSignatureCanvas);

        // 수정 모드에서 서명 패드에 그리기 시작할 때 기존 서명 미리보기 숨기기
        modalNamePad.addEventListener('beginStroke', () => {
            if (currentEditMode && signaturePreview) {
                signaturePreview.style.display = 'none';
                signaturePreview.classList.add('hidden');
                console.log('서명 패드 사용 시작 - 기존 서명 미리보기 숨김');
            }
        });

        modalSignaturePad.addEventListener('beginStroke', () => {
            if (currentEditMode && signaturePreview) {
                signaturePreview.style.display = 'none';
                signaturePreview.classList.add('hidden');
                console.log('서명 패드 사용 시작 - 기존 서명 미리보기 숨김');
            }
        });
    };

    // 모달 열기
    const openSignatureModal = () => {
        signatureModalOverlay.style.display = 'flex';

        // 중앙화된 스크롤 락 시스템으로 강력한 배경 상호작용 차단
        lockBodyInteraction();

        // 모달이 열린 후 서명 패드 초기화
        setTimeout(() => {
            initializeModalSignaturePads();

            // 기존 서명 데이터가 있으면 복원
            if (currentSignatureData) {
                const { nameData, signatureData } = currentSignatureData;
                if (nameData && modalNamePad) {
                    modalNamePad.fromDataURL(nameData);
                }
                if (signatureData && modalSignaturePad) {
                    modalSignaturePad.fromDataURL(signatureData);
                }
            }
        }, 100);
    };

    // 모달 닫기
    const closeSignatureModal = () => {
        signatureModalOverlay.style.display = 'none';

        // 중앙화된 스크롤 락 시스템으로 배경 상호작용 복원
        unlockBodyInteraction();
    };

    // 서명 저장
    const saveSignature = async () => {
        if (!modalNamePad || !modalSignaturePad) {
            alert('서명 패드가 초기화되지 않았습니다.');
            return;
        }

        if (modalNamePad.isEmpty() || modalSignaturePad.isEmpty()) {
            alert('이름과 서명을 모두 입력해주세요.');
            return;
        }

        try {
            // 서명 데이터 저장
            const nameData = modalNamePad.toDataURL('image/png');
            const signatureData = modalSignaturePad.toDataURL('image/png');

            currentSignatureData = { nameData, signatureData };

            // combinePads 함수를 사용하여 결합된 이미지 생성
            const combinedDataUrl = await combinePads(modalNamePad, modalSignaturePad);

            // UI 업데이트
            signatureResultImg.src = combinedDataUrl;
            signatureResultImg.style.display = 'block';
            signaturePlaceholderText.style.display = 'none';
            signatureTriggerArea.classList.add('completed');
            signatureDataUrlInput.value = combinedDataUrl;

            closeSignatureModal();
        } catch (error) {
            console.error('서명 저장 중 오류:', error);
            alert('서명 저장 중 오류가 발생했습니다.');
        }
    };

    // 모달 이벤트 리스너
    signatureTriggerArea.addEventListener('click', openSignatureModal);
    nameModalClearBtn.addEventListener('click', () => {
        if (modalNamePad) modalNamePad.clear();
    });
    signatureModalClearBtn.addEventListener('click', () => {
        if (modalSignaturePad) modalSignaturePad.clear();
    });
    signatureModalSaveBtn.addEventListener('click', saveSignature);
    signatureModalCancelBtn.addEventListener('click', closeSignatureModal);

    // 모달 외부 클릭 시 닫기 - 백그라운드 이벤트 완전 차단
    signatureModalOverlay.addEventListener('click', (event) => {
        // 모든 클릭 이벤트를 차단하여 백그라운드 상호작용 방지
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // 오직 오버레이 자체를 클릭했을 때만 모달 닫기
        if (event.target === signatureModalOverlay) {
            closeSignatureModal();
        }

        // 모든 경우에 이벤트 전파 차단
        return false;
    });

    // 글로벌 이벤트 핸들러가 모든 터치 이벤트를 처리하므로 개별 리스너 제거됨

    // ===================================================================
    // 헬퍼 함수
    // ===================================================================

    const fileToBase64 = (file, inputElement = null) => new Promise((resolve, reject) => {
        // 크롭된 파일이 있는 경우 우선 사용 (브라우저 호환성)
        if (inputElement && inputElement._croppedFile) {
            file = inputElement._croppedFile;
            console.log('크롭된 파일 사용:', file.name);
        }

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

                // 계약서 이미지나 명의변경 이미지인 경우 크롭 모달 자동 표시
                if (input.id === 'contractImage' || input.id === 'nameChangeImage') {
                    console.log(`크롭 모달 표시 대상: ${input.id}`);                    
                } else {
                    // 일반 미리보기 표시
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        preview.src = event.target.result;
                        preview.classList.remove('hidden');
                        preview.style.display = 'block'; // 숨겨진 상태에서 보이도록
                        console.log(`새 이미지 미리보기 설정 완료: ${input.id}`);
                    };
                    reader.readAsDataURL(file);
                }
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
    // 이미지 크롭 기능
    // ===================================================================

    let currentCropper = null;
    let currentInputFile = null;
    let currentPreviewElement = null;


    // --- 강력한 모바일 브라우저 모달 스크롤 방지 시스템 ---

    // 글로벌 이벤트 핸들러 및 옵션 정의
    const preventDefaultScroll = (e) => {
        // 모달 내부 요소에서 발생한 이벤트는 허용
        const modalElements = [
            '#signature-modal-content',
            '#crop-modal .modal-content',
            '#edit-request-modal .modal-content',
            '#loading-modal'
        ];

        // 이벤트가 모달 내부에서 발생했는지 확인
        for (let selector of modalElements) {
            const modalElement = document.querySelector(selector);
            if (modalElement && modalElement.contains(e.target)) {
                // 모달 내부에서는 터치 이벤트 허용 (버튼 클릭 등을 위해)
                return;
            }
        }

        // 모달 외부에서만 스크롤 차단
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    const nonPassive = { passive: false };
    let savedScrollPosition = 0;

    // 중앙화된 배경 상호작용 차단 함수
    const lockBodyInteraction = () => {
        // 현재 스크롤 위치 저장
        savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        // body에 modal-open 클래스 추가 (CSS로 overflow: hidden, position: fixed 적용)
        document.body.classList.add('modal-open');
        document.body.style.top = `-${savedScrollPosition}px`;

        // 스크롤만 차단하고 클릭은 허용 - touchmove와 wheel만 차단
        window.addEventListener('touchmove', preventDefaultScroll, nonPassive);
        window.addEventListener('wheel', preventDefaultScroll, nonPassive);

        console.log('배경 스크롤 차단 활성화 (버튼 클릭은 허용), 저장된 스크롤 위치:', savedScrollPosition);
    };

    // 중앙화된 배경 상호작용 복원 함수
    const unlockBodyInteraction = () => {
        // body에서 modal-open 클래스 제거
        document.body.classList.remove('modal-open');
        document.body.style.top = '';

        // 이벤트 리스너 제거하여 정상적인 스크롤 복원
        window.removeEventListener('touchmove', preventDefaultScroll, nonPassive);
        window.removeEventListener('wheel', preventDefaultScroll, nonPassive);

        // 저장된 스크롤 위치로 복원
        window.scrollTo(0, savedScrollPosition);

        console.log('배경 상호작용 복원 완료, 복원된 스크롤 위치:', savedScrollPosition);
    };

    // Legacy crop modal implementation removed - using new rotation-safe implementation below

    // ===================================================================
    // 새로운 회전 안전한 크롭 모달 구현
    // ===================================================================
    (function () {
    // ===== Elements
    const cropModal = document.getElementById('crop-modal');
    const cropImgEl = document.getElementById('crop-image');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const cropOkBtn = document.getElementById('crop-complete-btn');
    const cropSkipBtn = document.getElementById('crop-skip-btn');
    const cropCloseBtn = document.getElementById('close-crop-modal-btn');

    const inputContract = document.getElementById('contractImage');
    const inputNameChange = document.getElementById('nameChangeImage');

    // ===== State
    let cropper = null;
    let activeInput = null;        // <input type="file"> which opened the modal
    let currentRotation = 0;       // absolute degree (0, 90, 180, 270)
    let isInitialLoad = true;      // 새 이미지 업로드 시 true, 회전 시 false
    let objectUrl = null;          // for the original selected file (to revoke later)

    // ===== Helpers
    const clampRotation = (deg) => ((deg % 360) + 360) % 360; // -> 0..359

    // 스크롤 위치 저장 변수
    let savedScrollPosition = 0;

    function openModal() {
        // 현재 스크롤 위치 저장
        savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        cropModal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        // 모달 열기 시 저장된 위치로 고정
        document.body.style.top = `-${savedScrollPosition}px`;
    }

    function closeModal() {
        cropModal.classList.add('hidden');
        document.body.classList.remove('modal-open');

        // 저장된 스크롤 위치로 복원
        document.body.style.top = '';
        window.scrollTo(0, savedScrollPosition);

        if (cropper) {
        cropper.destroy();
        cropper = null;
        }
        if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        }
        cropImgEl.removeAttribute('src');
        activeInput = null;
        currentRotation = 0;
        isInitialLoad = true;

        // 로딩 상태 제거
        const cropContainer = document.querySelector('.crop-container');
        cropContainer?.classList.remove('rotating');
    }

    function initCropper() {
        if (cropper) cropper.destroy();

        // 새 이미지 로드 시 상태 초기화
        currentRotation = 0;
        isInitialLoad = true;

        cropper = new Cropper(cropImgEl, {
        viewMode: 2,           // keep the image fully inside the container
        dragMode: 'move',
        autoCrop: true,
        autoCropArea: 1,       // initial crop = whole image
        modal: false,          // no gray mask (we control background via CSS)
        background: false,
        responsive: true,
        restore: false,        // don't restore previous crop on re-init
        checkOrientation: false,  // EXIF 자동 회전 비활성화로 깔끔한 로딩
        toggleDragModeOnDblclick: false,
        ready() {
            // 초기 업로드 vs 회전 시 다른 로직 적용
            if (isInitialLoad) {
                // 처음 업로드: 이미지를 캔버스에 꽉 채우기
                initializeImageSize();
            } else {
                // 회전 시: 동적 캔버스 리사이징 적용
                fitImageToContainerAndSnapCropbox();
            }
        },
        });
    }

    // --- 🆕 단순화된 초기 이미지 설정
    function initializeImageSize() {
        if (!cropper) return;

        // 이미지의 실제 캔버스 데이터를 가져와서 이미지 경계에 맞춘 크롭박스 설정
        const canvasData = cropper.getCanvasData();

        // 크롭박스를 이미지의 실제 경계에 맞춤 (이미지를 꽉 채우도록)
        cropper.setCropBoxData({
            left: canvasData.left,
            top: canvasData.top,
            width: canvasData.width,
            height: canvasData.height
        });

        console.log(`🎯 초기 크롭: 이미지 경계에 맞춘 크롭박스 설정`);
    }

    // --- 🆕 단순화된 회전 및 중앙 정렬 함수
    function fitImageToContainerAndSnapCropbox() {
        if (!cropper) return;

        const angle = currentRotation;

        // 1) 회전 적용
        cropper.rotateTo(angle);

        // 2) 컨테이너와 캔버스 데이터 정확히 가져오기
        const containerData = cropper.getContainerData();
        const canvasData = cropper.getCanvasData();

        // 3) 캔버스에 이미지가 적절히 맞도록 스케일 계산
        const scaleW = containerData.width / canvasData.naturalWidth;
        const scaleH = containerData.height / canvasData.naturalHeight;
        const scale = Math.min(scaleW, scaleH) * 0.8; // 80% 크기로 여유있게

        const newWidth = canvasData.naturalWidth * scale;
        const newHeight = canvasData.naturalHeight * scale;

        // 4) 컨테이너 기준 정확한 중앙 계산
        const left = (containerData.width - newWidth) / 2;
        const top = (containerData.height - newHeight) / 2;

        // 5) 캔버스 데이터 즉시 적용
        cropper.setCanvasData({
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(newWidth),
            height: Math.round(newHeight)
        });

        // 6) 크롭박스를 캔버스 중앙에 70% 크기로 설정
        const cropBoxSize = Math.min(newWidth, newHeight) * 0.7;
        const cropLeft = left + (newWidth - cropBoxSize) / 2;
        const cropTop = top + (newHeight - cropBoxSize) / 2;

        cropper.setCropBoxData({
            left: Math.round(cropLeft),
            top: Math.round(cropTop),
            width: Math.round(cropBoxSize),
            height: Math.round(cropBoxSize)
        });

        console.log(`✅ 회전 완료: ${angle}°, 정확한 중앙 정렬 완료`);
    }

    // ===== Event wiring
    function handleFileChange(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        activeInput = e.target; // remember which input opened the modal
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(file);

        cropImgEl.onload = () => {
        initCropper();
        };

        openModal();
        cropImgEl.src = objectUrl;
    }

    inputContract && inputContract.addEventListener('change', handleFileChange);
    inputNameChange && inputNameChange.addEventListener('change', handleFileChange);

    rotateLeftBtn && rotateLeftBtn.addEventListener('click', () => {
        if (!cropper) return;

        // 회전 시작: 초기 로드 상태 해제
        isInitialLoad = false;

        // 로딩 상태 표시
        rotateLeftBtn.classList.add('loading');
        rotateRightBtn.disabled = true;

        currentRotation = clampRotation(currentRotation - 90);
        console.log(`🔄 좌회전: ${currentRotation}°`);

        // 회전 실행 후 로딩 상태 제거
        setTimeout(() => {
            fitImageToContainerAndSnapCropbox();

            // 로딩 상태 제거
            rotateLeftBtn.classList.remove('loading');
            rotateRightBtn.disabled = false;
        }, 10); // 최소한의 딜레이로 로딩 표시
    });

    rotateRightBtn && rotateRightBtn.addEventListener('click', () => {
        if (!cropper) return;

        // 회전 시작: 초기 로드 상태 해제
        isInitialLoad = false;

        // 로딩 상태 표시
        rotateRightBtn.classList.add('loading');
        rotateLeftBtn.disabled = true;

        currentRotation = clampRotation(currentRotation + 90);
        console.log(`🔄 우회전: ${currentRotation}°`);

        // 회전 실행 후 로딩 상태 제거
        setTimeout(() => {
            fitImageToContainerAndSnapCropbox();

            // 로딩 상태 제거
            rotateRightBtn.classList.remove('loading');
            rotateLeftBtn.disabled = false;
        }, 10); // 최소한의 딜레이로 로딩 표시
    });

    cropOkBtn && cropOkBtn.addEventListener('click', () => {
        if (!cropper || !activeInput) return;

        const canvas = cropper.getCroppedCanvas({ imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // choose correct preview target
        const previewId = activeInput.id === 'contractImage' ? 'contract-preview' : 'nameChange-preview';
        const preview = document.getElementById(previewId);
        if (preview) {
        preview.src = dataUrl;
        preview.classList.remove('hidden');
        }

        // expose the cropped result for form submission logic (if any)
        activeInput.dataset.cropped = '1';
        activeInput.dataset.croppedDataUrl = dataUrl;

        closeModal();
    });

    cropSkipBtn && cropSkipBtn.addEventListener('click', () => {
        if (!activeInput) return;

        const url = objectUrl; // original image as-is
        const previewId = activeInput.id === 'contractImage' ? 'contract-preview' : 'nameChange-preview';
        const preview = document.getElementById(previewId);
        if (preview && url) {
        preview.src = url;
        preview.classList.remove('hidden');
        }

        activeInput.dataset.cropped = '';
        activeInput.dataset.croppedDataUrl = '';

        closeModal();
    });

    cropCloseBtn && cropCloseBtn.addEventListener('click', closeModal);
    // Optional: close when clicking the dimmed area
    cropModal && cropModal.addEventListener('click', (e) => {
        if (e.target === cropModal) closeModal();
    });

    // Refit on viewport changes while modal is open (debounced)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (!cropper || cropModal.classList.contains('hidden')) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
        fitImageToContainerAndSnapCropbox();
        }, 120);
    });
    })();

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
            console.log(`=== setImagePreview 호출: ${fallbackText} ===`);
            console.log(`- 요소:`, imgElement);
            console.log(`- URL:`, url);

            if (!imgElement) {
                console.warn(`이미지 요소를 찾을 수 없음: ${fallbackText}`);
                return;
            }

            if (url && url.trim() !== '') {
                console.log(`이미지 로드 시도: ${fallbackText}`, url);

                // Google Drive 공유 URL을 직접 이미지 URL로 변환
                let imageUrl = url;
                if (url.includes('drive.google.com')) {
                    // Google Drive 파일 ID 추출
                    const fileId = url.match(/[-\w]{25,}/);
                    if (fileId) {
                        imageUrl = `https://drive.google.com/thumbnail?id=${fileId[0]}&sz=w500`;
                        console.log(`Google Drive 이미지 URL 변환: ${imageUrl}`);
                    }
                }

                imgElement.src = imageUrl;
                imgElement.classList.remove('hidden');
                imgElement.style.display = 'block'; // display를 명시적으로 설정

                // 이미지 로드 실패 시 처리
                imgElement.onerror = () => {
                    console.error(`❌ 이미지 로드 실패: ${fallbackText}`, url);
                    console.error(`- 시도한 URL:`, imageUrl);
                    imgElement.style.display = 'none';
                    imgElement.classList.add('hidden');
                };

                imgElement.onload = () => {
                    console.log(`✅ 이미지 로드 성공: ${fallbackText}`);
                    imgElement.style.display = 'block';
                    imgElement.classList.remove('hidden');
                };
            } else {
                console.log(`이미지 URL 없음: ${fallbackText}`);
                if (imgElement) {
                    imgElement.style.display = 'none';
                    imgElement.classList.add('hidden');
                }
            }
        };

        // 이미지 키들도 여러 가능성으로 시도
        const contractImageKeys = ['5. 계약서 사진첨부', '5. 계약서 사진 첨부', 'contractImage', '5. 계약서사진첨부'];
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

        // 데이터에 있는 모든 키 확인
        console.log('=== 수정 데이터에 포함된 모든 키 ===');
        Object.keys(data).forEach(key => {
            if (key.includes('계약') || key.includes('사진') || key.includes('이미지')) {
                console.log(`키: "${key}" => 값: "${data[key]}"`);
            }
        });

        // 계약서 이미지 URL 확인을 위한 디버깅
        const contractImageUrl = findDataByKeys(contractImageKeys);
        console.log('계약서 이미지 URL:', contractImageUrl);
        console.log('계약서 미리보기 요소:', contractPreview);

        // 각 키로 직접 확인
        contractImageKeys.forEach(key => {
            if (data[key]) {
                console.log(`키 "${key}"로 찾은 값:`, data[key]);
            }
        });

        setImagePreview(contractPreview, contractImageUrl, '계약서 사진');
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
    openEditModalBtn.addEventListener('click', () => {
        editRequestModal.classList.remove('hidden');
        lockBodyInteraction();
    });

    closeEditModalBtn.addEventListener('click', () => {
        editRequestModal.classList.add('hidden');
        unlockBodyInteraction();
    });

    // 오버레이 클릭 시 모달 닫기
    editRequestModal.addEventListener('click', (e) => {
        if (e.target === editRequestModal) {
            editRequestModal.classList.add('hidden');
            unlockBodyInteraction();
        }
    });
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

    // --- 전체 동의 체크박스 기능 ---
    const agreeAllPrivacyCheckbox = document.getElementById('agreeAllPrivacy');
    const privacyCheckboxes = ['agreePrivacy', 'agreeProvider'];

    if (agreeAllPrivacyCheckbox) {
        // 전체 동의 체크박스 클릭 시
        agreeAllPrivacyCheckbox.addEventListener('change', () => {
            const isChecked = agreeAllPrivacyCheckbox.checked;
            privacyCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = isChecked;
                }
            });
            console.log(`개인정보 전체 동의: ${isChecked ? '체크됨' : '해제됨'}`);
        });

        // 개별 체크박스 상태 변경 시 전체 동의 상태 업데이트
        privacyCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    const allChecked = privacyCheckboxes.every(checkboxId => {
                        const cb = document.getElementById(checkboxId);
                        return cb && cb.checked;
                    });
                    agreeAllPrivacyCheckbox.checked = allChecked;
                });
            }
        });
    }

    // --- 이미지 미리보기 ---
    setupImagePreview(contractImageInput, contractPreview);
    setupImagePreview(nameChangeImageInput, nameChangePreview);

    // --- 폼 제출 처리 ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 즉시 버튼 비활성화로 중복 제출 방지
        if (submitBtn.disabled) {
            console.log('이미 제출 중입니다. 중복 제출 방지.');
            return;
        }
        submitBtn.disabled = true;

        if (!isEmailVerified) {
            submitBtn.disabled = false; // 에러 시 버튼 재활성화
            return alert('이메일 인증을 먼저 완료해주세요.');
        }

        // 필수 필드 유효성 검사
        if (!currentEditMode) {
            // 신규 제출 시 모든 필수 항목 체크
            const requiredFields = { fullName: "성명", dongHo: "동호수", dob: "생년월일", phone: "연락처", editPassword: "수정용 비밀번호" };
            for (const [id, name] of Object.entries(requiredFields)) {
                if (!document.getElementById(id).value) {
                    submitBtn.disabled = false; // 에러 시 버튼 재활성화
                    return alert(`필수 항목을 입력해주세요: ${name}`);
                }
            }
            if (!contractImageInput.files[0]) {
                submitBtn.disabled = false; // 에러 시 버튼 재활성화
                return alert("필수 항목을 첨부해주세요: 계약서 사진");
            }
            if (!signatureDataUrlInput.value) {
                submitBtn.disabled = false; // 에러 시 버튼 재활성화
                return alert("필수 항목을 입력해주세요: 이름(정자체)과 서명");
            }
        } else {
            // 수정 모드에서는 기본 텍스트 필드만 체크 (이미지와 서명은 선택사항)
            const requiredFields = { fullName: "성명", dongHo: "동호수", dob: "생년월일", phone: "연락처" };
            for (const [id, name] of Object.entries(requiredFields)) {
                if (!document.getElementById(id).value) {
                    submitBtn.disabled = false; // 에러 시 버튼 재활성화
                    return alert(`필수 항목을 입력해주세요: ${name}`);
                }
            }

            // 수정 모드에서는 이미지 파일들이 없어도 기존 데이터 재사용하므로 검사하지 않음
            // 서명도 기존 서명을 재사용할 수 있으므로 검사하지 않음
            console.log('수정 모드: 이미지 및 서명 유효성 검사 건너뜀 (기존 데이터 재사용)');
        }

        loadingModal.classList.remove('hidden');
        lockBodyInteraction();

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
            // 모달 서명 데이터 확인
            if (signatureDataUrlInput.value) {
                const dataUrl = signatureDataUrlInput.value;
                combinedSignatureObject = { base64: dataUrl.split(',')[1], type: 'image/png', name: 'combined_signature.png' };
            }
            
            const dataToSend = {
                ...formData,
                // 수정 모드에서는 originalEmail을 사용하되, 백엔드가 email 필드를 기대하므로 email로도 설정
                email: currentEditMode ? originalEmail : formData.email,
                originalEmail: currentEditMode ? originalEmail : formData.email,
                contractImageFile: await fileToBase64(contractImageInput.files[0], contractImageInput),
                nameChangeImageFile: await fileToBase64(nameChangeImageInput.files[0], nameChangeImageInput),
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
            unlockBodyInteraction();
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
            lockBodyInteraction();
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
                unlockBodyInteraction();
            }
        } else {
            console.log("수정 토큰 없음. 일반 제출 모드로 시작합니다.");
            // 일반 모드에서는 이메일 인증 후 제출 버튼 활성화
        }
    };

    // --- 페이지 초기화 함수 실행 ---
    initializePage();
});