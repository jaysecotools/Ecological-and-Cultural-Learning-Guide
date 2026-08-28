/* ============================================
   AHCECR309 - Main JavaScript
   Conduct an ecological and cultural site inspection
   ============================================ */

// ===== Configuration =====
const APP_CONFIG = {
    progressKey: 'ahcecr309_progress',
    version: '1.0.0',
    modules: ['module1', 'module2', 'module3', 'module4', 'module5']
};

// ===== Utility Functions =====
function $(selector, context = document) {
    return context.querySelector(selector);
}

function $$(selector, context = document) {
    return [...context.querySelectorAll(selector)];
}

function getElementById(id) {
    return document.getElementById(id);
}

function addClass(el, className) {
    if (el) el.classList.add(className);
}

function removeClass(el, className) {
    if (el) el.classList.remove(className);
}

function hasClass(el, className) {
    return el ? el.classList.contains(className) : false;
}

function toggleClass(el, className) {
    if (el) el.classList.toggle(className);
}

// ===== Tab Navigation =====
function initTabs() {
    const tabs = $$('.nav-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-target');
            switchTab(targetId);
        });
        
        tab.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const targetId = this.getAttribute('data-target');
                switchTab(targetId);
            }
        });
    });
}

function switchTab(targetId) {
    $$('.nav-tab').forEach(t => {
        removeClass(t, 'active');
        t.setAttribute('aria-selected', 'false');
    });
    
    const activeTab = $(`.nav-tab[data-target="${targetId}"]`);
    if (activeTab) {
        addClass(activeTab, 'active');
        activeTab.setAttribute('aria-selected', 'true');
    }
    
    $$('.content-section').forEach(s => {
        removeClass(s, 'active');
        s.setAttribute('hidden', 'true');
    });
    
    const targetSection = getElementById(targetId);
    if (targetSection) {
        addClass(targetSection, 'active');
        targetSection.removeAttribute('hidden');
    }
}

// ===== Progress Tracking =====
function getProgress() {
    try {
        const saved = localStorage.getItem(APP_CONFIG.progressKey);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.warn('Failed to load progress:', e);
        return {};
    }
}

function saveProgress(progress) {
    try {
        localStorage.setItem(APP_CONFIG.progressKey, JSON.stringify(progress));
    } catch (e) {
        console.warn('Failed to save progress:', e);
    }
}

function getModuleProgress(moduleId) {
    const progress = getProgress();
    return progress[moduleId] || 0;
}

function updateModuleProgress(moduleId, value) {
    const progress = getProgress();
    const current = progress[moduleId] || 0;
    progress[moduleId] = Math.min(current + value, 100);
    saveProgress(progress);
    updateAllProgressBars();
    return progress[moduleId];
}

function setModuleProgress(moduleId, value) {
    const progress = getProgress();
    progress[moduleId] = Math.min(Math.max(value, 0), 100);
    saveProgress(progress);
    updateAllProgressBars();
    return progress[moduleId];
}

function getOverallProgress() {
    const progress = getProgress();
    const modules = APP_CONFIG.modules;
    const total = modules.length;
    let completed = 0;
    
    modules.forEach(moduleId => {
        if ((progress[moduleId] || 0) >= 100) {
            completed++;
        }
    });
    
    return Math.round((completed / total) * 100);
}

function updateAllProgressBars() {
    const overall = getOverallProgress();
    const mainProgress = $('#main-progress');
    if (mainProgress) {
        mainProgress.style.width = overall + '%';
        mainProgress.setAttribute('aria-valuenow', overall);
    }
    
    const progressText = $('#progress-text');
    if (progressText) {
        progressText.textContent = overall + '%';
    }
    
    const moduleId = document.body.getAttribute('data-module');
    if (moduleId) {
        const moduleProgress = getModuleProgress(moduleId);
        const moduleBar = $('#module-progress-bar');
        if (moduleBar) {
            moduleBar.style.width = moduleProgress + '%';
        }
        const moduleText = $('#module-progress-text');
        if (moduleText) {
            moduleText.textContent = moduleProgress + '%';
        }
    }
}

// ===== Activity Completion =====
function completeActivity(activityId, moduleId, points = 5) {
    const key = `${moduleId}_${activityId}`;
    const progress = getProgress();
    const completed = progress.completed_activities || {};
    
    if (completed[key]) {
        return false;
    }
    
    completed[key] = true;
    progress.completed_activities = completed;
    saveProgress(progress);
    updateModuleProgress(moduleId, points);
    return true;
}

function isActivityCompleted(moduleId, activityId) {
    const key = `${moduleId}_${activityId}`;
    const progress = getProgress();
    const completed = progress.completed_activities || {};
    return !!completed[key];
}

// ===== Quiz Functions =====
function initQuiz(container) {
    const options = container.querySelectorAll('.quiz-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const parent = this.closest('.quiz-question') || this.closest('.interactive-box');
            parent.querySelectorAll('.quiz-option').forEach(o => {
                removeClass(o, 'selected');
            });
            addClass(this, 'selected');
        });
        
        option.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    const checkButtons = container.querySelectorAll('.check-answer');
    checkButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parent = this.closest('.quiz-question') || this.closest('.interactive-box');
            const options = parent.querySelectorAll('.quiz-option');
            const feedback = parent.querySelector('.feedback');
            
            let selected = null;
            options.forEach(o => {
                if (hasClass(o, 'selected')) {
                    selected = o;
                }
            });
            
            if (!selected) {
                showFeedback(feedback, 'Please select an answer first.', 'incorrect');
                return;
            }
            
            const isCorrect = selected.getAttribute('data-correct') === 'true';
            const moduleId = document.body.getAttribute('data-module') || 'general';
            
            if (isCorrect) {
                const questionId = parent.id || 'quiz';
                const activityId = `quiz_${questionId}`;
                const completed = completeActivity(activityId, moduleId, 5);
                const message = 'Correct! ' + (completed ? 'Progress updated!' : '');
                showFeedback(feedback, message, 'correct');
            } else {
                showFeedback(feedback, 'Incorrect. Try again!', 'incorrect');
            }
        });
    });
}

function showFeedback(element, message, type) {
    if (!element) return;
    element.textContent = message;
    removeClass(element, 'correct');
    removeClass(element, 'incorrect');
    removeClass(element, 'info');
    addClass(element, type);
    element.style.display = 'block';
}

// ===== Flashcard System =====
function initFlashcards(flashcardsData) {
    let currentIndex = 0;
    const cardContent = $('#flashcard-content');
    const answerDiv = $('#flashcard-answer');
    const revealBtn = $('#reveal-flashcard');
    const prevBtn = $('#prev-flashcard');
    const nextBtn = $('#next-flashcard');
    
    if (!cardContent || !flashcardsData || flashcardsData.length === 0) return;
    
    function updateCard() {
        const data = flashcardsData[currentIndex];
        cardContent.innerHTML = `<h4>${data.question}</h4>`;
        if (answerDiv) {
            answerDiv.textContent = data.answer;
            answerDiv.style.display = 'none';
        }
        if (revealBtn) {
            revealBtn.innerHTML = '<i class="fas fa-eye"></i> Reveal Answer';
            revealBtn.setAttribute('aria-expanded', 'false');
        }
    }
    
    function revealAnswer() {
        if (!answerDiv) return;
        if (answerDiv.style.display === 'none') {
            answerDiv.style.display = 'block';
            if (revealBtn) {
                revealBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Answer';
                revealBtn.setAttribute('aria-expanded', 'true');
            }
            const moduleId = document.body.getAttribute('data-module') || 'general';
            if (currentIndex === flashcardsData.length - 1) {
                completeActivity('flashcards_completed', moduleId, 5);
            }
        } else {
            answerDiv.style.display = 'none';
            if (revealBtn) {
                revealBtn.innerHTML = '<i class="fas fa-eye"></i> Reveal Answer';
                revealBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }
    
    function nextCard() {
        currentIndex = (currentIndex + 1) % flashcardsData.length;
        updateCard();
    }
    
    function prevCard() {
        currentIndex = (currentIndex - 1 + flashcardsData.length) % flashcardsData.length;
        updateCard();
    }
    
    updateCard();
    if (revealBtn) revealBtn.addEventListener('click', revealAnswer);
    if (nextBtn) nextBtn.addEventListener('click', nextCard);
    if (prevBtn) prevBtn.addEventListener('click', prevCard);
}

// ===== Species Identification =====
function initSpeciesIdentification() {
    const checkBtn = $('#check-species');
    if (!checkBtn) return;
    
    checkBtn.addEventListener('click', function() {
        const select = $('#species-select');
        const feedback = $('#species-feedback');
        const moduleId = document.body.getAttribute('data-module') || 'general';
        
        if (!select || !select.value) {
            showFeedback(feedback, 'Please select a species first.', 'incorrect');
            return;
        }
        
        const correct = select.getAttribute('data-correct');
        const isCorrect = select.value === correct;
        
        if (isCorrect) {
            const completed = completeActivity('species_identification', moduleId, 5);
            showFeedback(feedback, 'Correct! ' + (completed ? 'Progress updated!' : ''), 'correct');
        } else {
            showFeedback(feedback, 'Incorrect. Try again!', 'incorrect');
        }
    });
}

// ===== Ecosystem Mapping =====
function initEcosystemMapping() {
    const checkBtn = $('#check-ecosystem');
    if (!checkBtn) return;
    
    checkBtn.addEventListener('click', function() {
        const select = $('#ecosystem-select');
        const feedback = $('#ecosystem-feedback');
        const moduleId = document.body.getAttribute('data-module') || 'general';
        
        if (!select || !select.value) {
            showFeedback(feedback, 'Please select an ecosystem type.', 'incorrect');
            return;
        }
        
        const correct = select.getAttribute('data-correct');
        const isCorrect = select.value === correct;
        
        if (isCorrect) {
            const completed = completeActivity('ecosystem_mapping', moduleId, 5);
            showFeedback(feedback, 'Correct! ' + (completed ? 'Progress updated!' : ''), 'correct');
        } else {
            showFeedback(feedback, 'Incorrect. Try again!', 'incorrect');
        }
    });
}

// ===== Threat Identification =====
function initThreatIdentification() {
    const checkBtn = $('#check-threats');
    if (!checkBtn) return;
    
    checkBtn.addEventListener('click', function() {
        const container = this.closest('.interactive-box');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const feedback = $('#threats-feedback');
        const moduleId = document.body.getAttribute('data-module') || 'general';
        
        let allChecked = true;
        let anyChecked = false;
        
        checkboxes.forEach(cb => {
            if (cb.checked) anyChecked = true;
            if (!cb.checked) allChecked = false;
        });
        
        if (!anyChecked) {
            showFeedback(feedback, 'Please select at least one threat.', 'incorrect');
            return;
        }
        
        if (allChecked) {
            const completed = completeActivity('threat_identification', moduleId, 5);
            showFeedback(feedback, 'Correct! All threats identified. ' + (completed ? 'Progress updated!' : ''), 'correct');
        } else {
            showFeedback(feedback, 'Not quite. All these threats are potential concerns in this scenario.', 'incorrect');
        }
    });
}

// ===== Matching Activity =====
function initMatching() {
    const checkBtn = $('#check-matching');
    if (!checkBtn) return;
    
    checkBtn.addEventListener('click', function() {
        const feedback = $('#matching-feedback');
        const moduleId = document.body.getAttribute('data-module') || 'general';
        const match1 = $('#match-1');
        const match2 = $('#match-2');
        
        if (!match1 || !match2 || !match1.value || !match2.value) {
            showFeedback(feedback, 'Please complete both matches.', 'incorrect');
            return;
        }
        
        const correct1 = match1.getAttribute('data-correct');
        const correct2 = match2.getAttribute('data-correct');
        
        if (match1.value === correct1 && match2.value === correct2) {
            const completed = completeActivity('matching', moduleId, 5);
            showFeedback(feedback, 'Correct! ' + (completed ? 'Progress updated!' : ''), 'correct');
        } else {
            showFeedback(feedback, 'Incorrect. Try again!', 'incorrect');
        }
    });
}

// ===== Inspection Form =====
function initInspectionForm() {
    const submitBtn = $('#submit-inspection');
    const saveBtn = $('#save-draft');
    const feedback = $('#inspection-feedback');
    const moduleId = document.body.getAttribute('data-module') || 'general';
    
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const siteName = $('#site-name');
            if (!siteName || !siteName.value.trim()) {
                showFeedback(feedback, 'Please enter a site name before submitting.', 'incorrect');
                return;
            }
            const completed = completeActivity('inspection_submitted', moduleId, 15);
            showFeedback(feedback, 'Inspection submitted successfully! ' + (completed ? 'Progress updated!' : ''), 'correct');
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            showFeedback(feedback, 'Inspection saved as draft.', 'info');
        });
    }
}

// ===== Download Resources =====
function initDownloads() {
    const downloadButtons = $$('.download-resource');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const resourcePath = this.getAttribute('data-resource');
            const name = this.closest('.download-card')?.querySelector('h4')?.textContent || 'Resource';
            
            const parent = this.closest('.download-card') || this.parentElement;
            let feedback = parent.querySelector('.download-feedback');
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'feedback info';
                feedback.style.marginTop = '10px';
                parent.appendChild(feedback);
            }
            
            showFeedback(feedback, `Downloading ${name}...`, 'info');
            
            setTimeout(() => {
                try {
                    const link = document.createElement('a');
                    link.href = resourcePath;
                    link.download = resourcePath.split('/').pop();
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showFeedback(feedback, `${name} downloaded successfully!`, 'correct');
                    setTimeout(() => {
                        feedback.style.display = 'none';
                    }, 3000);
                } catch (error) {
                    showFeedback(feedback, `Error downloading ${name}. Please try again.`, 'incorrect');
                    console.error('Download error:', error);
                }
            }, 500);
        });
    });
}

// ===== Link Search =====
function initLinkSearch() {
    const searchInput = $('#link-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        const links = $$('.resource-link');
        const categories = $$('.link-category');
        let visibleCount = 0;
        
        links.forEach(link => {
            const title = link.querySelector('.link-title')?.textContent?.toLowerCase() || '';
            const description = link.querySelector('.link-description')?.textContent?.toLowerCase() || '';
            const matches = !term || title.includes(term) || description.includes(term);
            
            link.closest('li').style.display = matches ? 'block' : 'none';
            if (matches) visibleCount++;
        });
        
        categories.forEach(category => {
            const visible = category.querySelectorAll('li[style*="display: block"], li:not([style*="display: none"])').length;
            category.style.display = visible > 0 ? 'block' : 'none';
        });
        
        const feedback = $('#links-feedback');
        if (feedback) {
            if (term && visibleCount === 0) {
                showFeedback(feedback, 'No links found matching your search.', 'incorrect');
            } else {
                feedback.style.display = 'none';
            }
        }
    });
}

// ===== Keyboard Shortcuts =====
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const tabs = $$('.nav-tab');
            const index = parseInt(e.key) - 1;
            if (tabs[index]) {
                tabs[index].click();
            }
        }
    });
}

// ===== Initialize Everything =====
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initKeyboardShortcuts();
    updateAllProgressBars();
    initQuiz(document);
    initSpeciesIdentification();
    initEcosystemMapping();
    initThreatIdentification();
    initMatching();
    initInspectionForm();
    initDownloads();
    initLinkSearch();
});