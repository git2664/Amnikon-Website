/* Footer component — injected into every page via this script */
(function () {
    const placeholder = document.getElementById("footer-placeholder");
    if (!placeholder) return;

    placeholder.outerHTML = `
<footer class="site-footer" id="site-footer">

    <!-- HUGE WORDMARK -->


    <!-- CTA -->

    <div class="footer-cta">

        <div class="footer-wordmark">
            <span>AMNIKON</span>
        </div>

        <div class="container">

            <div class="footer-cta-content">

                <div>

                    <div class="eyebrow">
                        LET'S BUILD SOMETHING GREAT
                    </div>

                    <h2>
                        <span class="footer-title-line">Ready to Transform Your</span>
                        <span class="footer-title-line">IT?</span>
                    </h2>

                    <p>
                        From managed IT and cloud infrastructure
                        to cybersecurity and strategic consulting,
                        AMNIKON helps businesses scale with confidence.
                    </p>

                </div>

                <div class="footer-cta-actions">

                    <a href="/pages/contact/contact.html"
                       class="footer-action footer-action-primary">
                        General Enquiries
                    </a>

                    <a href="/pages/support/support.html"
                       class="footer-action footer-action-secondary">
                        Request a Consultation
                    </a>

                </div>

            </div>

        </div>

    </div>


    <!-- FOOTER LINKS -->

    <div class="footer-main">

        <div class="container">

            <div class="footer-grid">


                <!-- BRAND -->

                <div class="footer-brand">

                    <h4>AMNIKON</h4>

                    <p>
                        Engineering Digital Growth through
                        managed services, cybersecurity,
                        cloud infrastructure and strategic IT.
                    </p>

                </div>


                <!-- COMPANY -->

                <div class="footer-col">

                    <h5>Company</h5>

                    <ul>

                        <li>
                            <a href="/pages/about/company.html">
                                About Us
                            </a>
                        </li>

                        <li>
                            <a href="/pages/about/team.html">
                                Our People &amp; Culture
                            </a>
                        </li>

                        <li>
                            <a href="/pages/projects/index.html">
                                Projects
                            </a>
                        </li>

                        <li>
                            <a href="/pages/careers/careers.html">
                                Careers
                            </a>
                        </li>

                    </ul>

                </div>


                <!-- SERVICES -->

                <div class="footer-col">

                    <h5>Services</h5>

                    <ul>
                        <li><a href="/pages/services/advisory.html">IT Advisory</a></li>
                        <li><a href="/pages/services/professional-services.html">Professional Services</a></li>
                        <li><a href="/pages/services/cloud.html">Cloud &amp; Azure</a></li>
                        <li><a href="/pages/services/cybersecurity.html">Cybersecurity</a></li>
                        <li><a href="/pages/services/communication-collaboration.html">Communication &amp; Collaboration</a></li>
                        <li><a href="/pages/services/digital-services.html">Digital Services</a></li>
                        <li><a href="/pages/services/ai-automation.html">AI &amp; Automation</a></li>
                        <li><a href="/pages/services/managed-it.html">Managed IT Services</a></li>
                    </ul>

                </div>


                <!-- CONTACT -->

                <div class="footer-col footer-contact">

                    <h5>Contact</h5>

                    <ul>

                        <!-- Email -->

                        <li>
                            <a href="mailto:info@amnikontechnologies.com"
                               class="info-email">
                                info@amnikontechnologies.com
                            </a>
                        </li>


                        <!-- MAIN BRANCH -->

                        <li class="footer-address">

                            <h5>
                                Main Branch
                            </h5>

                            <a class="info-address map-link" href="https://www.google.com/maps/search/?api=1&amp;query=Building%20A1%2C%20Dubai%20Silicon%20Oasis%2C%20Dubai%2C%20United%20Arab%20Emirates" target="_blank" rel="noopener noreferrer" aria-label="Open Building A1, Dubai Silicon Oasis, Dubai, United Arab Emirates in Google Maps">
                                Building A1, Dubai Silicon Oasis,
                                Dubai, United Arab Emirates
                             <span aria-hidden="true">↗</span></a>

                        </li>


                        <!-- BRANCH -->

                        <li class="footer-address">

                            <h5>
                                Branch
                            </h5>

                            <a class="info-address map-link" href="https://www.google.com/maps/search/?api=1&amp;query=Arihant%20Aura%20Thane%20-%20Belapur%20Rd%2C%20Turbhe%20MIDC%2C%20Navi%20Mumbai" target="_blank" rel="noopener noreferrer" aria-label="Open Arihant Aura Thane - Belapur Rd, Turbhe MIDC, Navi Mumbai in Google Maps">
                                Arihant Aura Thane - Belapur Rd, Turbhe MIDC, Navi Mumbai
                             <span aria-hidden="true">↗</span></a>

                        </li>

                    </ul>

                </div>


            </div>


            <!-- FOOTER BOTTOM -->

            <div class="footer-bottom">

                <p>
                    © ${new Date().getFullYear()} AMNIKON Technologies.
                    All rights reserved.
                </p>

                <div class="footer-bottom-links">

                    <a href="/pages/legal/privacy.html">
                        Privacy Policy
                    </a>

                    <a href="/pages/legal/terms.html">
                        Terms of Service
                    </a>

                </div>

            </div>

        </div>

    </div>

</footer>
`;
})();
