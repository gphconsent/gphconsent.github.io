// ===================================================================
// pcupload.js - PC 스캔 동의서 일괄 업로드
// Google Apps Script 연동
// ===================================================================


document.addEventListener('DOMContentLoaded', () => {
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwxHUs6wrQFM-PuqHzUvL51-jUD7eCLKvaTOegz0V36oJQ4RJkJogTQiEtKoBqalqukgw/exec';
    const API_KEY = 'GEM-PROJECT-GPH-2025';

    // --- DOM 요소 ---
    const guideToggle = document.getElementById('guide-toggle');
    const guideContent = document.getElementById('guide-content');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const selectedFilesSection = document.getElementById('selected-files-section');
    const fileList = document.getElementById('file-list');
    const fileCountSpan = document.getElementById('file-count');
    const clearFilesBtn = document.getElementById('clear-files-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const progressCard = document.getElementById('progress-card');
    const successList = document.getElementById('success-list');
    const failureList = document.getElementById('failure-list');
    const successEmpty = document.getElementById('success-empty');
    const failureEmpty = document.getElementById('failure-empty');
    const totalCountSpan = document.getElementById('total-count');
    const successCountSpan = document.getElementById('success-count');
    const errorCountSpan = document.getElementById('error-count');
    const successBadge = document.querySelector('.success-badge');
    const failureBadge = document.querySelector('.failure-badge');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const toast = document.getElementById('toast');

    // --- 상태 변수 ---
    let selectedFiles = [];
    let uploadStats = {
        total: 0,
        success: 0,
        error: 0
    };

    // ================================================================
    // 아코디언 토글
    // ================================================================
    guideToggle.addEventListener('click', () => {
        const isOpen = guideContent.classList.contains('open');
        if (isOpen) {
            guideContent.classList.remove('open');
            guideToggle.classList.remove('active');
        } else {
            guideContent.classList.add('open');
            guideToggle.classList.add('active');
        }
    });

    // ================================================================
    // 파일 선택 (버튼 클릭)
    // ================================================================
    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
    });

    // ================================================================
    // 드래그앤드롭
    // ================================================================
    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.closest('.drop-zone-content')) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFileSelection(e.dataTransfer.files);
    });

    // ================================================================
    // 파일 선택 처리
    // ================================================================
    function handleFileSelection(files) {
        const validFiles = Array.from(files).filter(file => {
            const isImage = file.type.startsWith('image/');
            const isPDF = file.type === 'application/pdf';
            return isImage || isPDF;
        });

        if (validFiles.length === 0) {
            alert('이미지 파일 또는 PDF 파일만 선택할 수 있습니다.');
            return;
        }

        // 기존 파일에 추가
        validFiles.forEach(file => {
            // 중복 체크
            const isDuplicate = selectedFiles.some(f =>
                f.name === file.name && f.size === file.size
            );
            if (!isDuplicate) {
                selectedFiles.push(file);
            }
        });

        updateFileList();
        fileInput.value = ''; // 초기화하여 같은 파일 재선택 가능하게
    }

    // ================================================================
    // 파일 목록 UI 업데이트
    // ================================================================
    function updateFileList() {
        if (selectedFiles.length === 0) {
            selectedFilesSection.classList.add('hidden');
            uploadBtn.disabled = true;
            return;
        }

        selectedFilesSection.classList.remove('hidden');
        uploadBtn.disabled = false;
        fileCountSpan.textContent = selectedFiles.length;

        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const fileItem = createFileItem(file, index);
            fileList.appendChild(fileItem);
        });
    }

    // ================================================================
    // 파일 아이템 생성
    // ================================================================
    function createFileItem(file, index) {
        const item = document.createElement('div');
        item.className = 'file-item';

        // 파일 형식에 따른 아이콘
        const icon = file.type.startsWith('image/') ? '🖼️' : '📄';

        // 파일 크기 포맷팅
        const size = formatFileSize(file.size);

        // 파일명 검증
        const validation = validateFileName(file.name);
        const validationIcon = validation.isValid ? '✅' : '⚠️';
        const validationColor = validation.isValid ? '#28a745' : '#dc3545';

        item.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${icon}</span>
                <div>
                    <div class="file-name">
                        <span style="color: ${validationColor}; margin-right: 5px;">${validationIcon}</span>
                        ${file.name}
                    </div>
                    <div class="file-size">${size}${!validation.isValid ? ' - ' + validation.message : ''}</div>
                </div>
            </div>
            <button class="file-remove" data-index="${index}">삭제</button>
        `;

        // 삭제 버튼 이벤트
        item.querySelector('.file-remove').addEventListener('click', () => {
            removeFile(index);
        });

        return item;
    }

    // ================================================================
    // 파일 크기 포맷팅
    // ================================================================
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // ================================================================
    // 파일명 검증 (동_호수 형식)
    // ================================================================
    function validateFileName(fileName) {
        // 확장자 제거
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

        // 동_호수 형식 정규식 (예: 103_204)
        const pattern = /^\d+_\d+$/;

        if (!pattern.test(nameWithoutExt)) {
            return {
                isValid: false,
                message: '파일명이 "동_호수" 형식이 아닙니다'
            };
        }

        return { isValid: true, message: '' };
    }

    // ================================================================
    // 파일 삭제
    // ================================================================
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    }

    // ================================================================
    // 파일 목록 초기화
    // ================================================================
    clearFilesBtn.addEventListener('click', () => {
        if (confirm('선택된 모든 파일을 삭제하시겠습니까?')) {
            selectedFiles = [];
            updateFileList();
        }
    });

    // ================================================================
    // 업로드 시작
    // ================================================================
    uploadBtn.addEventListener('click', async () => {
        const invalidFiles = selectedFiles.filter(file => !validateFileName(file.name).isValid);
        if (invalidFiles.length > 0) {
            const fileNames = invalidFiles.map(f => f.name).join('\n');
            alert(`다음 파일의 이름이 올바르지 않습니다:\n\n${fileNames}\n\n파일명을 "동_호수" 형식으로 수정해주세요.`);
            return;
        }

        if (!confirm(`${selectedFiles.length}개의 파일을 업로드하시겠습니까?`)) return;

        uploadBtn.disabled = true;
        clearFilesBtn.disabled = true;
        selectFilesBtn.disabled = true;
        progressCard.classList.remove('hidden');

        uploadStats = { total: selectedFiles.length, success: 0, error: 0 };
        updateStats();

        successList.innerHTML = '';
        failureList.innerHTML = '';
        successEmpty.style.display = 'flex';
        failureEmpty.style.display = 'flex';

        // 각 파일 개별 처리
        for (const file of selectedFiles) {
            // [수정] processFile 함수를 호출하도록 수정
            await processFile(file);
        }

        const successRate = Math.round((uploadStats.success / uploadStats.total) * 100);
        alert(`업로드가 완료되었습니다!\n\n성공: ${uploadStats.success}개\n실패: ${uploadStats.error}개\n성공률: ${successRate}%`);

        uploadBtn.disabled = false;
        clearFilesBtn.disabled = false;
        selectFilesBtn.disabled = false;
    });

    // [신규] 파일을 Base64로 변환하는 헬퍼 함수
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // 'data:...,' 부분 제외
        reader.onerror = error => reject(error);
    });

    // [신규] 개별 파일을 처리하고 서버에 업로드하는 함수
    async function processFile(file) {
        try {
            // 1. 파일을 Base64로 인코딩
            const base64Data = await toBase64(file);

            // 2. 서버로 보낼 데이터(Payload) 구성
            const payload = {
                apiKey: API_KEY,
                action: 'uploadScan',
                fileData: {
                    fileName: file.name,
                    mimeType: file.type,
                    data: base64Data
                }
            };
            
            // 3. fetch API를 사용하여 서버(GAS)에 POST 요청 전송
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow'
            });

            // 4. 서버 응답 파싱
            if (!response.ok) {
                 throw new Error(`서버 응답 오류: ${response.status}`);
            }
            const result = await response.json();

            // 5. 결과에 따라 UI 업데이트
            if (result.status === 'success') {
                uploadStats.success++;
                addResultItem(file.name, 'success', result.message || '업로드 성공');
            } else {
                throw new Error(result.message || '알 수 없는 서버 오류');
            }

        } catch (error) {
            // 6. 에러 발생 시 UI 업데이트
            console.error(`[${file.name}] 업로드 실패:`, error);
            uploadStats.error++;
            addResultItem(file.name, 'error', error.message);
        } finally {
            // 7. 통계 및 컬럼 카운트 업데이트
            updateStats();
            updateColumnCounts();
        }
    }

    
    // ================================================================
    // 결과 아이템을 적절한 리스트에 추가
    // ================================================================
    function addResultItem(fileName, status, message) {
        const item = document.createElement('div');
        item.className = `progress-item ${status}`;
        item.dataset.fileName = fileName;
        item.innerHTML = `
            <div class="progress-filename">${fileName}</div>
            <div class="progress-status ${status}">${message}</div>
        `;

        if (status === 'success') {
            successList.appendChild(item);
            successEmpty.style.display = 'none';
        } else {
            failureList.appendChild(item);
            failureEmpty.style.display = 'none';
        }
    }

    // ================================================================
    // 컬럼 카운트 배지 업데이트
    // ================================================================
    function updateColumnCounts() {
        const successCount = successList.children.length;
        const failureCount = failureList.children.length;

        successBadge.textContent = successCount;
        failureBadge.textContent = failureCount;
    }

    // ================================================================
    // 클립보드에 파일 목록 복사
    // ================================================================
    function copyToClipboard(columnType) {
        const list = columnType === 'success' ? successList : failureList;
        const items = list.querySelectorAll('.progress-item');

        if (items.length === 0) {
            showToast('복사할 파일이 없습니다');
            return;
        }

        const fileNames = Array.from(items).map(item =>
            item.dataset.fileName
        ).join('\n');

        // 클립보드 API 사용 (최신 브라우저)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fileNames)
                .then(() => {
                    showToast(`파일 목록이 복사되었습니다 (${items.length}개)`);
                })
                .catch(() => {
                    showToast('복사에 실패했습니다');
                });
        } else {
            // 폴백: 구형 브라우저 지원
            const textarea = document.createElement('textarea');
            textarea.value = fileNames;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast(`파일 목록이 복사되었습니다 (${items.length}개)`);
            } catch (err) {
                showToast('복사에 실패했습니다');
            }
            document.body.removeChild(textarea);
        }
    }

    // ================================================================
    // 토스트 알림 표시
    // ================================================================
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // ================================================================
    // 복사 버튼 이벤트 리스너
    // ================================================================
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const columnType = button.dataset.column;
            copyToClipboard(columnType);
        });
    });

    // ================================================================
    // 통계 업데이트
    // ================================================================
    function updateStats() {
        totalCountSpan.textContent = uploadStats.total;
        successCountSpan.textContent = uploadStats.success;
        errorCountSpan.textContent = uploadStats.error;
    }

    // ================================================================
    // 초기화: 아코디언 기본 열기
    // ================================================================
    guideContent.classList.add('open');
    guideToggle.classList.add('active');
});
