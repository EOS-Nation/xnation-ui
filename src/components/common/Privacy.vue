<template>
  <div class="parent">
    <div class="content d-flex flex-column align-items-start">
      <h1 class="align-self-center">Privacy Policy</h1>
      <div class="wrapper">
        <h2>EOS Nation</h2>
        <p>
          At EOS Nation, accessible from
          <a :href="website" class="orange" target="_blank">eosnation.io</a>,
          one of our main priorities is the privacy of our visitors. This
          Privacy Policy document contains types of information that is
          collected and recorded by EOS Nation and how we use it.
        </p>
        <p>
          If you have additional questions or require more information about our
          Privacy Policy, do not hesitate to contact us through email at
          <a :href="`mailto:${email}`" class="orange">info@eosnation.io.</a>
        </p>
        <h3>GENERAL DATA PROTECTION REGULATION (GDPR)</h3>
        <p>We are a Data Controller of your information.</p>
        <p>
          EOS Nation legal basis for collecting and using the personal
          information described in this Privacy Policy depends on the Personal
          Information we collect and the specific context in which we collect
          the information:
        </p>
        <ul>
          <li>EOS Nation needs to perform a contract with you</li>
          <li>You have given EOS Nation permission to do so</li>
          <li>
            Processing your personal information is in EOS Nation legitimate
            interests
          </li>
          <li>EOS Nation needs to comply with the law</li>
        </ul>
        <p>
          EOS Nation will retain your personal information only for as long as
          is necessary for the purposes set out in this Privacy Policy. We will
          retain and use your information to the extent necessary to comply with
          our legal obligations, resolve disputes, and enforce our policies.
        </p>
        <p>
          If you are a resident of the European Economic Area (EEA), you have
          certain data protection rights. If you wish to be informed what
          Personal Information we hold about you and if you want it to be
          removed from our systems, please contact us.
        </p>
        <p>
          In certain circumstances, you have the following data protection
          rights:
        </p>
        <ul>
          <li>
            The right to access, update or to delete the information we have on
            you.
          </li>
          <li>The right of rectification.</li>
          <li>The right to object.</li>
          <li>The right of restriction.</li>
          <li>The right to data portability.</li>
          <li>The right to withdraw consent.</li>
        </ul>
        <h2>Log Files</h2>
        <p>
          EOS Nation follows a standard procedure of using log files. These
          files log visitors when they visit websites. All hosting companies do
          this as a part of hosting services’ analytics. The information
          collected by log files include internet protocol (IP) addresses,
          browser type, Internet Service Provider (ISP), date and time stamp,
          referring/exit pages, and possibly the number of clicks. These are not
          linked to any information that is personally identifiable. The purpose
          of the information is for analyzing trends, administering the site,
          tracking users’ movement on the website, and gathering demographic
          information.
        </p>
        <h2>COOKIES AND WEB BEACONS</h2>
        <p>
          Like any other website, EOS Nation uses ‘cookies’. These cookies are
          used to store information including visitors’ preferences, and the
          pages on the website that the visitor accessed or visited. The
          information is used to optimize the users’ experience by customizing
          our web page content based on visitors’ browser type and/or other
          information.
        </p>
        <h2>PRIVACY POLICIES</h2>
        <p>
          You may consult this list to find the Privacy Policy for each of the
          advertising partners of EOS Nation.
        </p>
        <p>
          Third-party ad servers or ad networks uses technologies like cookies,
          JavaScript, or Web Beacons that are used in their respective
          advertisements and links that appear on EOS Nation, which are sent
          directly to users’ browser. They automatically receive your IP address
          when this occurs. These technologies are used to measure the
          effectiveness of their advertising campaigns and/or to personalize the
          advertising content that you see on websites that you visit.
        </p>
        <p>
          Note that EOS Nation has no access to or control over these cookies
          that are used by third-party advertisers.
        </p>
        <h2>THIRD PARTY PRIVACY POLICIES</h2>
        <p>
          EOS Nation’s Privacy Policy does not apply to other advertisers or
          websites. Thus, we are advising you to consult the respective Privacy
          Policies of these third-party ad servers for more detailed
          information. It may include their practices and instructions about how
          to opt-out of certain options. You may find a complete list of these
          Privacy Policies and their links here: Privacy Policy Links.
        </p>
        <p>
          You can choose to disable cookies through your individual browser
          options. To know more detailed information about cookie management
          with specific web browsers, it can be found at the browsers’
          respective websites. What Are Cookies?
        </p>
        <h2>CHILDREN’S INFORMATION</h2>
        <p>
          Another part of our priority is adding protection for children while
          using the internet. We encourage parents and guardians to observe,
          participate in, and/or monitor and guide their online activity.
        </p>
        <p>
          EOS Nation does not knowingly collect any Personal Identifiable
          Information from children under the age of 13. If you think that your
          child provided this kind of information on our website, we strongly
          encourage you to contact us immediately and we will do our best
          efforts to promptly remove such information from our records.
        </p>
        <h2>ONLINE PRIVACY POLICY ONLY</h2>
        <p>
          This privacy policy (GDPR Privacy Policy created at
          GDPRPrivacyNotice.com) applies only to our online activities and is
          valid for visitors to our website with regards to the information that
          they shared and/or collect in EOS Nation. This policy is not
          applicable to any information collected offline or via channels other
          than this website.
        </p>
        <h2>CONSENT</h2>
        <p>
          By using our website, you hereby consent to our Privacy Policy and
          agree to its terms.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Prop, Component, Vue } from "vue-property-decorator";

@Component({})
export default class Privacy extends Vue {
  get website() {
    return "https://eosnation.io";
  }

  get email() {
    return "info@eosnation.io";
  }
}
</script>

<style lang="scss" scoped>
.parent {
  margin: 20px;
  max-width: 80%;
  display: flex;
  align-self: center;
}

.content {
  background-color: white;
  padding: 15px;
}

.wrapper {
  padding: 20px;
}

.text {
  color: white;
}

.orange {
  color: #d18235;
}
</style>
