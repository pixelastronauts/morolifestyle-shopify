document.addEventListener('DOMContentLoaded', () => {
    let videoCards = document.querySelectorAll('.card--video');
    videoCards.forEach((videoCard) => {
        let video = videoCard.querySelector('video');

        videoCard.addEventListener('mouseenter', () => {
            video.play();
        });

        videoCard.addEventListener('mouseleave', () => {
            video.pause();
            video.currentTime = 0;
        });
    });
});