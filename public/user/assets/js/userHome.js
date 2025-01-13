 // JavaScript for sliding effect
 const slider = document.getElementById("slider");
 const images = slider.children;
 const totalImages = images.length;
 let currentIndex = 0;

 // Function to slide to the next image
 function slideImage() {
   currentIndex = (currentIndex + 1) % totalImages; // Cycle through images
   const offset = currentIndex * -100; // Calculate the offset for the slide
   slider.style.transform = `translateX(${offset}%)`; // Apply sliding effect
 }

 // Start the image slide interval
 setInterval(slideImage, 4000); // Change every 4 seconds




 //Add to cart sweet alert:
 function addToCart(id, event) {
    event.preventDefault();

    $.ajax({
      url: `/addToCart?id=${id}`,
      method: "get",
      success: (response) => {
        if (response.status) {
          Swal.fire({
            title: 'ADD TO CART',
            text: 'Product Added to cart',
            icon: 'success',
            timer: 1000,
            showConfirmButton: false,
          });
        } else if (response.alreadyInCart) {
          Swal.fire({
            title: 'Product Already in Cart',
            text: 'This product is already in your cart.',
            icon: 'info',
            confirmButtonText: 'View Cart',
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = '/cart';
            }
          });
        } else {
          Swal.fire({
            title: 'Login Required',
            text: 'Please log in to add products to your cart.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Login',
            cancelButtonText: 'Cancel',
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = '/login';
            } else {
              console.log('User canceled login');
            }
          });
        }
      },
      error: (error) => {
        console.error('Error:', error);
        alert('An error occurred. Please try again');
      }
    });
  }






  //Best Seller p[rodcts]
  const swiper = new Swiper('.swiper', {
    slidesPerView: 2, // Show 2 cards initially on mobile
    spaceBetween: 15, // Space between cards
    grabCursor: true, // Enable touch to scroll
    loop: true, // Infinite loop
    pagination: {
      el: '.swiper-pagination',
      clickable: true, // Enable pagination dots
    },
    breakpoints: {
      // Adjust the number of cards on larger screens
      576: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      992: {
        slidesPerView: 6,
        spaceBetween: 25,
      },
    },
  });



  // Initialize Swiper
const swipers = document.querySelectorAll(".swiper");
swipers.forEach((swiper) => {
  new Swiper(swiper, {
    slidesPerView: 2, // Default for mobile
    spaceBetween: 15,
    grabCursor: true,
    loop: true,
    pagination: {
      el: swiper.querySelector(".swiper-pagination"),
      clickable: true,
    },
    navigation: {
      nextEl: swiper.querySelector(".swiper-button-next"),
      prevEl: swiper.querySelector(".swiper-button-prev"),
    },
    breakpoints: {
      576: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
      992: {
        slidesPerView: 5,
        spaceBetween: 25,
      },
    },
  });
});
