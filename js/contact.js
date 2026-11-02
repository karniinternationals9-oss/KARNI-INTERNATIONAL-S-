/* Contact page: icons, Google Map and WhatsApp contact form */
(function () {
  "use strict";
  var KI = window.KI;

  KI.ready.then(function (cfg) {
    var map = { "ci-phone": "phone", "ci-wa": "whatsapp", "ci-mail": "mail", "ci-pin": "pin", "ci-clock": "clock" };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = KI.icons[map[id]];
    });

    var wrap = document.getElementById("map-wrap");
    var q = cfg.mapQuery || cfg.address;
    wrap.innerHTML = '<iframe title="Map showing our location" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
      encodeURIComponent(q) + '&z=14&output=embed"></iframe>';

    var form = document.getElementById("contact-form");
    function setErr(name, msg) {
      var input = form.elements[name];
      var err = document.getElementById("m-" + name + "-err");
      input.closest(".field").classList.toggle("has-error", !!msg);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
      return !msg;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var phone = form.phone.value.replace(/\D/g, "");
      var message = form.message.value.trim();
      var ok = [
        setErr("name", name.length < 2 ? "Please enter your name." : ""),
        setErr("phone", phone && !/^[6-9]\d{9}$/.test(phone) ? "Enter a valid 10-digit mobile number." : ""),
        setErr("message", message.length < 5 ? "Please write a short message." : "")
      ].every(Boolean);
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }
      var text = "Hello " + cfg.storeName + ",\n\n" +
        "Name: " + name + "\n" +
        (phone ? "Mobile: +91 " + phone + "\n" : "") +
        "Subject: " + form.subject.value + "\n\n" + message;
      window.open(KI.waLink(cfg.whatsapp, text), "_blank", "noopener");
    });
  });
})();
