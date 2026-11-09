/* ==========================================================
   SUPPORT PAGE
========================================================== */

// Animations must never prevent the support form from registering its handlers.
const supportAnimations = typeof gsap !== "undefined" ? gsap : {
    registerPlugin() {},
    timeline() { return { from() { return this; } }; },
    from() {},
    to() {}
};

if (typeof ScrollTrigger !== "undefined") {
    supportAnimations.registerPlugin(ScrollTrigger);
}

/* ==========================================================
   HERO ANIMATION
========================================================== */

const heroTimeline = supportAnimations.timeline();

heroTimeline
.from(".support-badge",{
    y:30,
    opacity:0,
    duration:.6,
    ease:"power3.out"
})

.from(".support-hero h1",{
    y:60,
    opacity:0,
    duration:.8,
    ease:"power4.out"
},"-=0.2")

.from(".support-hero p",{
    y:40,
    opacity:0,
    duration:.8,
    ease:"power3.out"
},"-=0.5")

.from(".support-hero .btn",{
    y:25,
    opacity:0,
    duration:.6,
    ease:"power3.out"
},"-=0.4");


/* ==========================================================
   SUPPORT CARDS
========================================================== */

supportAnimations.from(".support-option-card",{

    scrollTrigger:{
        trigger:".support-options",
        start:"top 80%"
    },

    y:80,
    opacity:0,
    stagger:.2,
    duration:.8,
    ease:"power3.out"

});


/* ==========================================================
   TICKET CARD
========================================================== */

supportAnimations.from(".ticket-card",{

    scrollTrigger:{
        trigger:".ticket-card",
        start:"top 80%"
    },

    y:80,
    opacity:0,
    duration:1,
    ease:"power3.out"

});


/* ==========================================================
   FLOATING CARD
========================================================== */

supportAnimations.to(".ticket-card",{

    y:10,

    repeat:-1,

    yoyo:true,

    duration:3,

    ease:"sine.inOut"

});


/* ==========================================================
   INPUT FOCUS EFFECT
========================================================== */

document.querySelectorAll(".form-control").forEach(input=>{

    input.addEventListener("focus",()=>{

        supportAnimations.to(input,{
            scale:1.02,
            duration:.2
        });

    });

    input.addEventListener("blur",()=>{

        supportAnimations.to(input,{
            scale:1,
            duration:.2
        });

    });

});


/* ==========================================================
   BUTTON HOVER
========================================================== */

const submitButton=document.getElementById("submitBtn");

if(submitButton){

    submitButton.addEventListener("mouseenter",()=>{

        supportAnimations.to(submitButton,{
            scale:1.05,
            duration:.2
        });

    });

    submitButton.addEventListener("mouseleave",()=>{

        supportAnimations.to(submitButton,{
            scale:1,
            duration:.2
        });

    });

}


/* ==========================================================
   SUPPORT FORM
========================================================== */

const form=document.getElementById("ticketForm");

const btn=document.getElementById("submitBtn");

const success=document.getElementById("successMessage");

const error=document.getElementById("errorMessage");

if(form){

form.addEventListener("submit",async function(e){

    e.preventDefault();

    if (btn.disabled) return;

    btn.disabled=true;

    btn.innerHTML="Submitting...";

    success.classList.remove("show");

    error.classList.remove("show");

    const data={

        name:document.getElementById("name").value.trim(),

        email:document.getElementById("email").value.trim(),

        priority:document.getElementById("priority").value,

        category:document.getElementById("category").value,

        subject:document.getElementById("subject").value.trim(),

        message:document.getElementById("message").value.trim()

    };

    try{

        data.submissionId = await AmnikonApi.submissionId("support", data);
        const protectionHeaders = await AmnikonFormProtection.headers(form);

        const response=await fetch(AmnikonApi.endpoint("support"),{

            method:"POST",

            headers:{
                "Content-Type":"application/json",
                ...protectionHeaders
            },

            body:JSON.stringify(data)

        });

        const result=await response.json();

        if(response.ok && (result.success === true || result.Success === true)){

            success.textContent="Your enquiry has been received. Our team will review it and contact you." +
                (result.submissionId ? " Reference: " + result.submissionId + "." : "") +
                (result.status === "queued" ? " A confirmation email will follow after processing." : "");

            success.classList.add("show");

            supportAnimations.from(success,{
                opacity:0,
                y:20,
                duration:.5
            });

            form.reset();
            AmnikonApi.completeSubmission("support");

        }
        else{

            error.textContent=AmnikonFormProtection.rejectionMessage(response, result, "We could not confirm receipt of your enquiry. Please try again later.");

            error.classList.add("show");

            supportAnimations.from(error,{
                opacity:0,
                y:20,
                duration:.5
            });

        }

    }
    catch(err){

        console.error(err);

        error.textContent=AmnikonFormProtection.errorMessage(err, "We could not confirm receipt of your enquiry. Your details have been kept. Please try again later.");

        error.classList.add("show");

        supportAnimations.from(error,{
            opacity:0,
            y:20,
            duration:.5
        });

    }

    AmnikonFormProtection.reset(form);
    btn.disabled=false;

    btn.innerHTML="Send Enquiry →";

});

}


/* ==========================================================
   PARALLAX HERO
========================================================== */

window.addEventListener("scroll",()=>{

    const scroll=window.scrollY;

    supportAnimations.to(".support-hero .container",{

        y:scroll*-0.12,

        duration:.3,

        overwrite:true

    });

});
