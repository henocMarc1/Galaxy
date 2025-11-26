window.showToast = function(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer') || (() => {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 420px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        return container;
    })();

    const toast = document.createElement('div');
    const colors = {
        success: { 
            bg: '#10B981', 
            icon: 'check_circle', 
            gradient: 'linear-gradient(135deg, #10B98166 0%, #6EE7B755 100%)',
            border: '#10B981',
            light: '#ECFDF5'
        },
        error: { 
            bg: '#EF4444', 
            icon: 'error', 
            gradient: 'linear-gradient(135deg, #EF444466 0%, #FB727255 100%)',
            border: '#EF4444',
            light: '#FEF2F2'
        },
        warning: { 
            bg: '#F59E0B', 
            icon: 'warning', 
            gradient: 'linear-gradient(135deg, #F59E0B66 0%, #FCD34D55 100%)',
            border: '#F59E0B',
            light: '#FFFBEB'
        },
        info: { 
            bg: '#3B82F6', 
            icon: 'info', 
            gradient: 'linear-gradient(135deg, #3B82F666 0%, #60A5FA55 100%)',
            border: '#3B82F6',
            light: '#EFF6FF'
        }
    };
    const { bg, icon, gradient, border, light } = colors[type] || colors.info;

    toast.className = `toast-premium toast-${type}`;
    toast.style.cssText = `
        background: ${light};
        color: #1F2937;
        padding: 16px 20px;
        border-radius: 14px;
        border: 1px solid ${border}33;
        border-left: 4px solid ${bg};
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 14px;
        animation: toastSlideIn 0.35s cubic-bezier(0.23, 1, 0.32, 1);
        font-size: 15px;
        word-wrap: break-word;
        min-width: 300px;
        max-width: 420px;
        position: relative;
        overflow: hidden;
        pointer-events: auto;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: ${bg};
        border-radius: 0 0 14px 0;
        width: 100%;
        animation: toastProgress ${duration}ms linear forwards;
    `;

    toast.innerHTML = `
        <span class="material-icons toast-icon" style="
            font-size: 24px;
            flex-shrink: 0;
            color: ${bg};
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        ">${icon}</span>
        <span style="flex: 1; font-weight: 500; line-height: 1.4;">${message}</span>
        <button class="toast-close-btn" style="
            background: none;
            border: none;
            cursor: pointer;
            color: #9CA3AF;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            transition: all 0.15s ease;
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            hover: background 0.15s;
        ">
            <span class="material-icons" style="font-size: 20px;">close</span>
        </button>
    `;

    // Close button hover
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = '#F3F4F6';
        closeBtn.style.color = '#6B7280';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
        closeBtn.style.color = '#9CA3AF';
    });

    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.32, 0, 0.67, 0) forwards';
        setTimeout(() => toast.remove(), 300);
    });

    // Hover pause animation
    toast.addEventListener('mouseenter', () => {
        progressBar.style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', () => {
        progressBar.style.animationPlayState = 'running';
    });

    toast.appendChild(progressBar);
    toastContainer.appendChild(toast);
    toastContainer.style.pointerEvents = 'auto';

    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideOut 0.3s cubic-bezier(0.32, 0, 0.67, 0) forwards';
                setTimeout(() => {
                    if (toast.parentElement) toast.remove();
                }, 300);
            }
        }, duration);
    }
};

if (!document.getElementById('toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes toastSlideIn {
            from {
                transform: translateX(420px) translateY(0) scale(0.92);
                opacity: 0;
            }
            to {
                transform: translateX(0) translateY(0) scale(1);
                opacity: 1;
            }
        }

        @keyframes toastSlideOut {
            from {
                transform: translateX(0) translateY(0) scale(1);
                opacity: 1;
            }
            to {
                transform: translateX(420px) translateY(0) scale(0.92);
                opacity: 0;
            }
        }

        @keyframes toastProgress {
            from {
                width: 100%;
            }
            to {
                width: 0%;
            }
        }

        .toast-premium {
            transition: all 0.2s ease;
        }

        .toast-premium:hover {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
            transform: translateY(-2px);
        }

        .toast-icon {
            animation: toastIconBounce 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        @keyframes toastIconBounce {
            0% {
                transform: scale(0.5) rotate(-20deg);
                opacity: 0;
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1) rotate(0);
                opacity: 1;
            }
        }

        @media (max-width: 480px) {
            #toastContainer {
                top: 10px !important;
                right: 10px !important;
                left: 10px !important;
                max-width: none !important;
            }

            .toast-premium {
                min-width: auto !important;
                max-width: 100% !important;
                font-size: 14px !important;
                padding: 14px 16px !important;
            }

            .toast-premium .material-icons {
                font-size: 20px !important;
            }
        }
    `;
    document.head.appendChild(style);
}
