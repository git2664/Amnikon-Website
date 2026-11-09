/* Navbar component — injected into every page via this script */
(function () {
  const placeholder = document.getElementById('navbar-placeholder');
  if (!placeholder) return;

  placeholder.outerHTML = `
<header class="navbar" id="navbar">
  <div class="nav-container">

    <a href="../home/index.html" class="nav-logo">
      <img
        src="../../assets/logos/Amnikon-logo.png"
        alt="AMNIKON Technologies"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      >
      <span class="nav-logo-text" style="display:none;">
        <span class="logo-main">AMNIKON</span>
        <span class="logo-sub">Technologies</span>
      </span>
    </a>

    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="main-menu">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <nav aria-label="Main navigation">
      <ul class="nav-menu" id="main-menu">

        <li class="has-dropdown">
          <button type="button" class="nav-disclosure" aria-expanded="false" aria-controls="nav-about">About</button>
          <ul class="dropdown-menu" id="nav-about" hidden>
            <li><a href="../about/company.html">Our Company</a></li>
            <li><a href="../about/team.html">Our People &amp; Culture</a></li>
          </ul>
        </li>

        <li class="has-dropdown">
          <button type="button" class="nav-disclosure" aria-expanded="false" aria-controls="nav-services">Services</button>
          <ul class="dropdown-menu" id="nav-services" hidden>
            <li class="services-overview"><a href="../services/services.html">All Services <span aria-hidden="true">↗</span></a></li>
            <li><a href="../services/advisory.html"><span class="nav-service-number" aria-hidden="true">01</span><span>IT Advisory</span></a></li>
            <li><a href="../services/professional-services.html"><span class="nav-service-number" aria-hidden="true">02</span><span>Professional Services</span></a></li>
            <li><a href="../services/cloud.html"><span class="nav-service-number" aria-hidden="true">03</span><span>Cloud &amp; Azure</span></a></li>
            <li><a href="../services/cybersecurity.html"><span class="nav-service-number" aria-hidden="true">04</span><span>Cybersecurity</span></a></li>
            <li><a href="../services/communication-collaboration.html"><span class="nav-service-number" aria-hidden="true">05</span><span>Communication &amp; Collaboration</span></a></li>
            <li><a href="../services/digital-services.html"><span class="nav-service-number" aria-hidden="true">06</span><span>Digital Services</span></a></li>
            <li><a href="../services/ai-automation.html"><span class="nav-service-number" aria-hidden="true">07</span><span>AI &amp; Automation</span></a></li>
            <li><a href="../services/managed-it.html"><span class="nav-service-number" aria-hidden="true">08</span><span>Managed IT Services</span></a></li>
          </ul>
        </li>

        <li><a href="../industries/industries.html">Industries</a></li>
        <li><a href="../projects/index.html">Projects</a></li>
        <li><a href="../careers/careers.html">Careers</a></li>
        
<li class="mobile-buttons">

    <a href="../support/support.html" class="btn btn-support">
        Request a Consultation
    </a>

    <a href="../contact/contact.html" class="btn btn-primary">
        General Enquiries
    </a>

</li>
      </ul>
    </nav>

    <div class="nav-actions">
      <a href="../support/support.html" class="btn btn-support">Request a Consultation</a>
      <a href="../contact/contact.html" class="btn btn-primary">General Enquiries</a>
    </div>



  </div>
</header>
`;
})();

