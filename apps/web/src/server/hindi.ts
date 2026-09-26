import { STATUS_DEFINITIONS } from '@akhra/shared';

const HINDI: Record<string, string> = {
  'Not found': 'नहीं मिला।',
  'Enter a valid 10-digit Indian mobile number': 'सही 10 अंकों का भारतीय मोबाइल नंबर डालें।',
  'Reference code looks like AKH-2026-000123': 'संदर्भ कोड AKH-2026-000123 जैसा दिखता है।',
  'Block name is too long': 'प्रखंड का नाम बहुत लंबा है।',
  'Enter a valid email address': 'सही ईमेल पता डालें।',
  'Organisation name is too long': 'संगठन का नाम बहुत लंबा है।',
  'Attach at most 5 files': 'ज़्यादा से ज़्यादा 5 फ़ाइलें जोड़ें।',
  'Consent is required before a report can be published publicly':
    'रिपोर्ट सार्वजनिक करने से पहले आपकी सहमति ज़रूरी है।',
  'Select at least one institution': 'कम से कम एक संस्थान चुनें।',
  'Select at least one form of support': 'मदद का कम से कम एक तरीका चुनें।',
  'Tell the team how you can help': 'टीम को बताइए कि आप कैसे मदद कर सकते हैं।',
  'Message cannot be empty': 'संदेश ख़ाली नहीं हो सकता।',
  'Accept the referral before starting a project':
    'परियोजना शुरू करने से पहले रिपोर्ट स्वीकार करें।',
  'Classify the report before routing it': 'आगे भेजने से पहले रिपोर्ट की श्रेणी तय करें।',
  'Internal notes are limited to the owning institution':
    'आंतरिक टिप्पणियाँ सिर्फ़ संबंधित संस्थान के लिए हैं।',
  'Only faculty or the institution’s administrator can do this':
    'यह सिर्फ़ शिक्षक या संस्थान के प्रशासक कर सकते हैं।',
  'Only people working on this report can post here':
    'यहाँ सिर्फ़ इस रिपोर्ट पर काम कर रहे लोग लिख सकते हैं।',
  'Only the project team can plan milestones': 'पड़ाव सिर्फ़ परियोजना टीम तय कर सकती है।',
  'Only the project team or the district’s officer can do this':
    'यह सिर्फ़ परियोजना टीम या ज़िले के अधिकारी कर सकते हैं।',
  'That milestone belongs to a different project': 'यह पड़ाव किसी दूसरी परियोजना का है।',
  'That milestone is not available to you': 'यह पड़ाव आपके लिए उपलब्ध नहीं है।',
  'That offer is not available to you': 'यह प्रस्ताव आपके लिए उपलब्ध नहीं है।',
  'That project does not belong to your institution': 'यह परियोजना आपके संस्थान की नहीं है।',
  'That project is not available to you': 'यह परियोजना आपके लिए उपलब्ध नहीं है।',
  'That project is not available': 'यह परियोजना उपलब्ध नहीं है।',
  'That referral does not belong to your institution':
    'यह रिपोर्ट आपके संस्थान को नहीं भेजी गई थी।',
  'That stage is not part of a project lifecycle':
    'यह चरण परियोजना की प्रक्रिया का हिस्सा नहीं है।',
  'You cannot change that offer': 'आप यह प्रस्ताव नहीं बदल सकते।',
  'Your account is not linked to an institution': 'आपका खाता किसी संस्थान से जुड़ा नहीं है।',
  'Your account is not linked to an organisation': 'आपका खाता किसी संगठन से जुड़ा नहीं है।',
  'A department officer must be attached to a department.':
    'विभागीय अधिकारी को किसी विभाग से जोड़ना ज़रूरी है।',
  'A description is needed to classify a report.': 'रिपोर्ट की श्रेणी तय करने के लिए विवरण चाहिए।',
  'A report can be reopened within 30 days of the action taken.':
    'कार्रवाई के 30 दिन के भीतर ही रिपोर्ट दोबारा खोली जा सकती है।',
  'A report can only be moved before a department has been asked to act on it.':
    'रिपोर्ट को किसी विभाग को सौंपे जाने से पहले ही दूसरे ज़िले में भेजा जा सकता है।',
  'A state-wide officer is not tied to a district.':
    'राज्य स्तर के अधिकारी किसी एक ज़िले से नहीं जुड़े होते।',
  'A title is needed to classify a report.': 'रिपोर्ट की श्रेणी तय करने के लिए शीर्षक चाहिए।',
  'Agree to how Akhra uses your information to continue.':
    'आगे बढ़ने के लिए अखरा द्वारा आपकी जानकारी के उपयोग पर सहमति दें।',
  'Choose a decision.': 'एक निर्णय चुनें।',
  'Choose a discipline.': 'एक विषय चुनें।',
  'Choose a file to upload.': 'अपलोड करने के लिए फ़ाइल चुनें।',
  'Choose a government department, not another kind of organisation.':
    'कोई सरकारी विभाग चुनें, किसी और तरह का संगठन नहीं।',
  'Choose a valid department.': 'सही विभाग चुनें।',
  'Choose a valid organisation.': 'सही संगठन चुनें।',
  'Choose an organisation that matches this role.': 'इस भूमिका से मेल खाने वाला संगठन चुनें।',
  'Choose at least one area your institution can work on.':
    'कम से कम एक क्षेत्र चुनें जिसमें आपका संस्थान काम कर सकता है।',
  'Choose the department that should fix this.': 'वह विभाग चुनें जिसे इसे ठीक करना चाहिए।',
  'Choose the department this officer joins.': 'वह विभाग चुनें जिसमें यह अधिकारी जुड़ेंगे।',
  'Choose the disciplines your institution teaches.': 'वे विषय चुनें जो आपका संस्थान पढ़ाता है।',
  'Choose the district the problem is actually in.': 'वह ज़िला चुनें जिसमें समस्या असल में है।',
  'Choose the district this officer is posted to.': 'वह ज़िला चुनें जहाँ यह अधिकारी पदस्थापित हैं।',
  'Choose the organisation this person will join.': 'वह संगठन चुनें जिसमें यह व्यक्ति जुड़ेंगे।',
  'Choose the result.': 'परिणाम चुनें।',
  'Choose university or industry.': 'विश्वविद्यालय या उद्योग चुनें।',
  'Choose what kind of partner this is.': 'चुनें कि यह किस तरह का साझेदार है।',
  'Choose what this officer is responsible for.': 'चुनें कि यह अधिकारी किसके लिए ज़िम्मेदार हैं।',
  'Choose whether this officer covers one district or the whole state.':
    'चुनें कि यह अधिकारी एक ज़िला देखेंगे या पूरा राज्य।',
  'Choose your district.': 'अपना ज़िला चुनें।',
  'Citizens create their own accounts; they are not invited.':
    'नागरिक अपना खाता ख़ुद बनाते हैं, उन्हें आमंत्रण नहीं भेजा जाता।',
  'Colleagues are invited by their own organisation’s administrator.':
    'सहकर्मियों को उनके अपने संगठन के प्रशासक आमंत्रित करते हैं।',
  'Decision recorded.': 'निर्णय दर्ज हो गया।',
  'Decision recorded. The team has been told.': 'निर्णय दर्ज हो गया। टीम को बता दिया गया है।',
  'Describe how it was tested, in at least 10 characters.':
    'बताइए कि परीक्षण कैसे किया गया, कम से कम 10 अक्षरों में।',
  'Describe the problem in at least 50 characters so it can be routed accurately.':
    'समस्या कम से कम 50 अक्षरों में बताइए, ताकि वह सही जगह पहुँच सके।',
  'Describe the problem.': 'समस्या बताइए।',
  'Did not meet the validation criteria.': 'यह जाँच के मानदंडों पर खरी नहीं उतरी।',
  'Did not meet validation criteria.': 'यह जाँच के मानदंडों पर खरी नहीं उतरी।',
  'Each area can be listed once.': 'हर क्षेत्र एक ही बार चुना जा सकता है।',
  'Enter a valid email address.': 'सही ईमेल पता डालें।',
  'Enter the MOU or empanelment reference this onboarding is based on.':
    'वह MOU या सूचीबद्धता संख्या डालें जिसके आधार पर यह जोड़ा जा रहा है।',
  'Enter the date of the test.': 'परीक्षण की तारीख़ डालें।',
  'Enter the last 4 digits of the mobile number on the report.':
    'रिपोर्ट में दिए मोबाइल नंबर के आख़िरी 4 अंक डालें।',
  'Enter the organisation’s full name.': 'संगठन का पूरा नाम डालें।',
  'Enter the organisation’s official contact email.': 'संगठन का आधिकारिक संपर्क ईमेल डालें।',
  'Enter the post this officer holds, as it appears on the order.':
    'इस अधिकारी का पद डालें, जैसा आदेश में लिखा है।',
  'Enter your 10-digit mobile number.': 'अपना 10 अंकों का मोबाइल नंबर डालें।',
  'Enter your name.': 'अपना नाम डालें।',
  'Files must be a photo (JPEG, PNG, WebP, HEIC), a video (MP4, MOV) or a PDF.':
    'फ़ाइल फ़ोटो (JPEG, PNG, WebP, HEIC), वीडियो (MP4, MOV) या PDF होनी चाहिए।',
  'Give the document a title of 3 to 180 characters.':
    'दस्तावेज़ को 3 से 180 अक्षरों का शीर्षक दें।',
  'Give the outcome a short title.': 'परिणाम को एक छोटा शीर्षक दें।',
  'Give the problem a clear title of at least 10 characters.':
    'समस्या को कम से कम 10 अक्षरों का साफ़ शीर्षक दें।',
  'Give the problem a short title.': 'समस्या को एक छोटा शीर्षक दें।',
  'Invitation accepted. Your new access is ready.':
    'आमंत्रण स्वीकार हो गया। आपकी नई पहुँच तैयार है।',
  'Keep the description under 2,000 characters.': 'विवरण 2,000 अक्षरों से कम रखें।',
  'Keep the description under 5,000 characters.': 'विवरण 5,000 अक्षरों से कम रखें।',
  'Keep the designation under 120 characters.': 'पदनाम 120 अक्षरों से कम रखें।',
  'Keep the note under 2,000 characters.': 'टिप्पणी 2,000 अक्षरों से कम रखें।',
  'Keep the reason under 300 characters.': 'कारण 300 अक्षरों से कम रखें।',
  'Keep the specialisation under 160 characters.': 'विशेषज्ञता 160 अक्षरों से कम रखें।',
  'Keep the title under 180 characters.': 'शीर्षक 180 अक्षरों से कम रखें।',
  'Keep this under 120 characters.': 'इसे 120 अक्षरों से कम रखें।',
  'Keep your name under 120 characters.': 'अपना नाम 120 अक्षरों से कम रखें।',
  'Milestone added.': 'पड़ाव जोड़ दिया गया।',
  'Milestone updated.': 'पड़ाव अपडेट हो गया।',
  'Missing or invalid reference.': 'संदर्भ नहीं मिला या सही नहीं है।',
  'Only a department officer can see a department queue.':
    'विभाग की सूची सिर्फ़ विभागीय अधिकारी देख सकते हैं।',
  'Only a district officer can move a report to another district.':
    'रिपोर्ट को दूसरे ज़िले में सिर्फ़ ज़िला अधिकारी भेज सकते हैं।',
  'Only a government officer can be scoped to a district.':
    'सिर्फ़ सरकारी अधिकारी को किसी ज़िले से जोड़ा जा सकता है।',
  'Only a government officer can export reports.':
    'रिपोर्टें सिर्फ़ सरकारी अधिकारी निकाल सकते हैं।',
  'Only a government officer can review proposals.':
    'प्रस्तावों की समीक्षा सिर्फ़ सरकारी अधिकारी कर सकते हैं।',
  'Only a patent has a filing status.': 'दाख़िल होने की स्थिति सिर्फ़ पेटेंट की होती है।',
  'Only a pending invitation can be withdrawn.': 'सिर्फ़ लंबित आमंत्रण ही वापस लिया जा सकता है।',
  'Only a report marked as done can be reopened.':
    'सिर्फ़ वही रिपोर्ट दोबारा खुल सकती है जिस पर काम पूरा बताया गया हो।',
  'Only a super administrator can change an officer’s posting.':
    'अधिकारी की पदस्थापना सिर्फ़ सुपर प्रशासक बदल सकते हैं।',
  'Only a super administrator can onboard an organisation.':
    'संगठन को सिर्फ़ सुपर प्रशासक जोड़ सकते हैं।',
  'Only a super administrator can promote someone to super administrator.':
    'किसी को सुपर प्रशासक सिर्फ़ सुपर प्रशासक ही बना सकते हैं।',
  'Only a super administrator can see this list.': 'यह सूची सिर्फ़ सुपर प्रशासक देख सकते हैं।',
  'Only administrators can see invitations.': 'आमंत्रण सिर्फ़ प्रशासक देख सकते हैं।',
  'Only administrators can withdraw invitations.': 'आमंत्रण सिर्फ़ प्रशासक वापस ले सकते हैं।',
  'Only an active government administrator can be promoted to super administrator.':
    'सिर्फ़ सक्रिय सरकारी प्रशासक को सुपर प्रशासक बनाया जा सकता है।',
  'Only an industry partner can make an offer on a project.':
    'परियोजना पर प्रस्ताव सिर्फ़ उद्योग साझेदार दे सकते हैं।',
  'Only an industry partner has a partner kind.':
    'साझेदार का प्रकार सिर्फ़ उद्योग साझेदार का होता है।',
  'Only someone who already holds government access can be reposted. Invite them instead.':
    'दूसरी जगह सिर्फ़ उन्हें भेजा जा सकता है जिनके पास पहले से सरकारी पहुँच है। बाकी को आमंत्रण भेजें।',
  'Only the institution’s administrator can change its profile.':
    'संस्थान की प्रोफ़ाइल सिर्फ़ उसके प्रशासक बदल सकते हैं।',
  'Only the latest submitted version of a proposal can be reviewed.':
    'सिर्फ़ प्रस्ताव के सबसे नए जमा संस्करण की समीक्षा हो सकती है।',
  'Only university staff can see their institution’s profile.':
    'संस्थान की प्रोफ़ाइल सिर्फ़ विश्वविद्यालय के कर्मचारी देख सकते हैं।',
  'Open the invitation link you were sent to accept it. If you no longer have it, ask whoever invited you for a new one.':
    'स्वीकार करने के लिए आपको भेजा गया आमंत्रण लिंक खोलें। अगर लिंक नहीं है, तो आमंत्रित करने वाले से नया माँगें।',
  'Outcome recorded.': 'परिणाम दर्ज हो गया।',
  'Please sign in to continue.': 'आगे बढ़ने के लिए साइन इन करें।',
  'Profile saved. Referrals will be matched against it from now on.':
    'प्रोफ़ाइल सहेज ली गई। अब से रिपोर्टें इसी के आधार पर आपको भेजी जाएँगी।',
  'Project created.': 'परियोजना बन गई।',
  'Project stage updated.': 'परियोजना का चरण अपडेट हो गया।',
  'Record what the test showed, in at least 10 characters.':
    'परीक्षण में क्या पता चला, कम से कम 10 अक्षरों में लिखें।',
  'Record why this posting is changing, as an order would.':
    'पदस्थापना बदलने का कारण लिखें, जैसे किसी आदेश में लिखा जाता है।',
  'Recorded. The person who reported it has been told.':
    'दर्ज हो गया। रिपोर्ट करने वाले व्यक्ति को बता दिया गया है।',
  'Reopened. The department has been told.': 'रिपोर्ट दोबारा खुल गई। विभाग को बता दिया गया है।',
  'Response recorded.': 'जवाब दर्ज हो गया।',
  'Say what was done to resolve it; the reporter sees this note.':
    'बताइए कि इसे सुलझाने के लिए क्या किया गया। रिपोर्ट करने वाले यह टिप्पणी देखेंगे।',
  'Please complete the check that you are not a robot, then send again.':
    'कृपया पुष्टि करें कि आप रोबोट नहीं हैं, फिर रिपोर्ट दोबारा भेजें।',
  'Your report could not be sent. Please try again.':
    'आपकी रिपोर्ट नहीं भेजी जा सकी। कृपया फिर से कोशिश करें।',
  'Update posted. The person who reported it has been told.':
    'जानकारी दर्ज हो गई। रिपोर्ट करने वाले व्यक्ति को बता दिया गया है।',
  'Say what has been done so far; the person who reported it reads this.':
    'अब तक क्या हुआ, यह लिखें; रिपोर्ट करने वाला व्यक्ति इसे पढ़ेगा।',
  'A progress update can be posted only while the work is open.':
    'प्रगति की जानकारी सिर्फ़ तभी दी जा सकती है जब काम चल रहा हो।',
  'Say what was done; the person who reported it reads this.':
    'बताइए कि क्या किया गया। रिपोर्ट करने वाले यह पढ़ेंगे।',
  'Say what was tested.': 'बताइए कि किसका परीक्षण हुआ।',
  'Say whether the patent is filed, published or granted.':
    'बताइए कि पेटेंट दाख़िल हुआ है, प्रकाशित हुआ है या मिल गया है।',
  'Say why it belongs to that district.': 'बताइए कि यह उस ज़िले की क्यों है।',
  'Select the original report to merge into.': 'वह मूल रिपोर्ट चुनें जिसमें इसे मिलाना है।',
  'Send the document as a file upload.': 'दस्तावेज़ को फ़ाइल के रूप में अपलोड करें।',
  'Send the photo or document as a file upload.':
    'फ़ोटो या दस्तावेज़ को फ़ाइल के रूप में अपलोड करें।',
  'Sent to the department.': 'विभाग को भेज दिया गया।',
  'Sign in to add your support to a report.': 'रिपोर्ट का समर्थन करने के लिए साइन इन करें।',
  'Sign in with the invited email address to accept this invitation.':
    'यह आमंत्रण स्वीकार करने के लिए उसी ईमेल पते से साइन इन करें जिस पर यह भेजा गया था।',
  'Some fields need your attention.': 'कुछ जानकारी ठीक करनी है।',
  'Some required details are missing.': 'कुछ ज़रूरी जानकारी छूट गई है।',
  'Someone else has already reviewed this proposal.': 'इस प्रस्ताव की समीक्षा कोई और कर चुका है।',
  'Something went wrong. Please try again.': 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।',
  'Super administrator access is never granted by invitation.':
    'सुपर प्रशासक की पहुँच कभी आमंत्रण से नहीं दी जाती।',
  'Team member added.': 'टीम सदस्य जोड़ दिया गया।',
  'Team member removed.': 'टीम सदस्य हटा दिया गया।',
  'Tell the department what is still wrong.': 'विभाग को बताइए कि अब भी क्या गड़बड़ है।',
  'Tell the team what needs to change, in at least 10 characters.':
    'टीम को बताइए कि क्या बदलना है, कम से कम 10 अक्षरों में।',
  'Test recorded.': 'परीक्षण दर्ज हो गया।',
  'Thank you. This report is now closed.': 'धन्यवाद। यह रिपोर्ट अब बंद हो गई है।',
  'That account could not be found.': 'यह खाता नहीं मिला।',
  'That account is suspended, so it cannot be given a new posting.':
    'यह खाता निलंबित है, इसलिए इसे नई पदस्थापना नहीं दी जा सकती।',
  'That account no longer exists.': 'यह खाता अब मौजूद नहीं है।',
  'That address already holds government access. Change their district or department under “Who holds access”, rather than sending a second invitation.':
    'इस पते के पास पहले से सरकारी पहुँच है। दूसरा आमंत्रण भेजने के बजाय “किसके पास पहुँच है” में उनका ज़िला या विभाग बदलें।',
  'That could not be found.': 'यह नहीं मिला।',
  'That department could not be found.': 'यह विभाग नहीं मिला।',
  'That district could not be found.': 'यह ज़िला नहीं मिला।',
  'That email already belongs to an Akhra account with its own access. Use a different address.':
    'यह ईमेल पहले से अखरा के एक खाते का है जिसकी अपनी पहुँच है। कोई दूसरा पता इस्तेमाल करें।',
  'That file is empty.': 'यह फ़ाइल ख़ाली है।',
  'That invitation could not be found.': 'यह आमंत्रण नहीं मिला।',
  'That offer has already been decided.': 'इस प्रस्ताव पर फ़ैसला हो चुका है।',
  'That person is not on your institution’s staff.':
    'यह व्यक्ति आपके संस्थान के कर्मचारियों में नहीं है।',
  'That proposal could not be found.': 'यह प्रस्ताव नहीं मिला।',
  'That report could not be found.': 'यह रिपोर्ट नहीं मिली।',
  'That report is already in this district.': 'यह रिपोर्ट पहले से इसी ज़िले में है।',
  'That report is not available to you': 'यह रिपोर्ट आपके लिए उपलब्ध नहीं है।',
  'That role does not belong to your kind of organisation.':
    'यह भूमिका आपके तरह के संगठन के लिए नहीं है।',
  'The description is too long to classify.': 'श्रेणी तय करने के लिए विवरण बहुत लंबा है।',
  'The description is too short to classify.': 'श्रेणी तय करने के लिए विवरण बहुत छोटा है।',
  'The last version is still with the district officer. Wait for their decision.':
    'पिछला संस्करण अभी ज़िला अधिकारी के पास है। उनके फ़ैसले का इंतज़ार करें।',
  'The organisation could not be created.': 'संगठन नहीं बन सका।',
  'The title is too long to classify.': 'श्रेणी तय करने के लिए शीर्षक बहुत लंबा है।',
  'The title is too short to classify.': 'श्रेणी तय करने के लिए शीर्षक बहुत छोटा है।',
  'This field cannot be set here.': 'यह जानकारी यहाँ नहीं बदली जा सकती।',
  'This file’s contents do not match its type. Upload the original photo, video or PDF.':
    'इस फ़ाइल की सामग्री उसके प्रकार से मेल नहीं खाती। असली फ़ोटो, वीडियो या PDF अपलोड करें।',
  'This form is missing something it needs. Reload the page and try again.':
    'इस फ़ॉर्म में कुछ ज़रूरी छूट गया है। पेज दोबारा खोलकर फिर कोशिश करें।',
  'This invitation has already been used.': 'यह आमंत्रण पहले ही इस्तेमाल हो चुका है।',
  'This invitation link is incomplete.': 'यह आमंत्रण लिंक अधूरा है।',
  'This invitation link is not valid. Ask whoever invited you to send a new one.':
    'यह आमंत्रण लिंक सही नहीं है। आमंत्रित करने वाले से नया भेजने को कहें।',
  'This invitation was sent to a different email address. Sign out and sign in with the address it was sent to.':
    'यह आमंत्रण किसी दूसरे ईमेल पते पर भेजा गया था। साइन आउट करके उसी पते से साइन इन करें।',
  'This invitation was withdrawn. Ask for a new one if you still need access.':
    'यह आमंत्रण वापस ले लिया गया। अगर अब भी पहुँच चाहिए, तो नया माँगें।',
  'This is the only super administrator left. Promote someone else first, or the platform would be left with nobody who can appoint officers.':
    'यह आख़िरी सुपर प्रशासक हैं। पहले किसी और को सुपर प्रशासक बनाएँ, नहीं तो अधिकारियों को नियुक्त करने वाला कोई नहीं बचेगा।',
  'This is your own report; supporting it would count you twice.':
    'यह आपकी अपनी रिपोर्ट है। इसका समर्थन करने से आप दो बार गिने जाएँगे।',
  'This project has finished and is no longer taking offers.':
    'यह परियोजना पूरी हो चुकी है और अब प्रस्ताव नहीं ले रही।',
  'This project’s proposal has been approved and is now its plan. Record changes as milestones.':
    'इस परियोजना का प्रस्ताव मंज़ूर होकर अब उसकी योजना है। बदलाव पड़ावों के रूप में दर्ज करें।',
  'This proposal is for a report in another district. Only that district’s officer can review it.':
    'यह प्रस्ताव दूसरे ज़िले की रिपोर्ट का है। इसकी समीक्षा सिर्फ़ उसी ज़िले के अधिकारी कर सकते हैं।',
  'This report has already been moved twice. Resolve it or reject it with a reason.':
    'यह रिपोर्ट पहले ही दो बार दूसरे ज़िले में भेजी जा चुकी है। इसे सुलझाएँ या कारण के साथ अस्वीकार करें।',
  'This report has already been reopened once.':
    'यह रिपोर्ट पहले ही एक बार दोबारा खोली जा चुकी है।',
  'This report is assigned to another department.': 'यह रिपोर्ट किसी दूसरे विभाग को सौंपी गई है।',
  'This report is closed, so it no longer takes support.':
    'यह रिपोर्ट बंद हो चुकी है, इसलिए अब इसका समर्थन नहीं किया जा सकता।',
  'This report is in another district. Only that district’s officer can act on it.':
    'यह रिपोर्ट दूसरे ज़िले की है। इस पर सिर्फ़ उसी ज़िले के अधिकारी कार्रवाई कर सकते हैं।',
  'This report is not waiting for your confirmation.':
    'यह रिपोर्ट आपकी पुष्टि का इंतज़ार नहीं कर रही।',
  'We could not match that report. Check the reference code and mobile number.':
    'यह रिपोर्ट मेल नहीं खाई। संदर्भ कोड और मोबाइल नंबर जाँचें।',
  'We could not reach Akhra. Check your connection and try again.':
    'अखरा से संपर्क नहीं हो सका। अपना इंटरनेट जाँचकर फिर कोशिश करें।',
  'Work starts once the district officer approves the proposal. Until then only the proposal can change.':
    'ज़िला अधिकारी के प्रस्ताव मंज़ूर करने के बाद ही काम शुरू होता है। तब तक सिर्फ़ प्रस्ताव बदला जा सकता है।',
  'You can only invite people into your own organisation.':
    'आप सिर्फ़ अपने संगठन में ही लोगों को आमंत्रित कर सकते हैं।',
  'You can only withdraw invitations from your own organisation.':
    'आप सिर्फ़ अपने संगठन के आमंत्रण ही वापस ले सकते हैं।',
  'You cannot change your own posting. Ask another super administrator to issue it, the way an appointment order is always signed by someone else.':
    'आप अपनी पदस्थापना ख़ुद नहीं बदल सकते। किसी दूसरे सुपर प्रशासक से कहें, जैसे नियुक्ति आदेश हमेशा कोई और जारी करता है।',
  'You cannot grant a role above your own.': 'आप अपनी भूमिका से ऊँची भूमिका नहीं दे सकते।',
  'You do not have permission to do this.': 'आपको यह करने की अनुमति नहीं है।',
  'Your account already has its own Akhra access, so this invitation cannot be added to it.':
    'आपके खाते के पास पहले से अखरा की अपनी पहुँच है, इसलिए यह आमंत्रण इसमें नहीं जोड़ा जा सकता।',
  'Your account does not have access to this.': 'आपके खाते के पास इसकी पहुँच नहीं है।',
  'Your account is not linked to an organisation.': 'आपका खाता किसी संगठन से जुड़ा नहीं है।',
  'Your department did this work, so someone outside it has to confirm or reopen it.':
    'यह काम आपके विभाग ने किया है, इसलिए इसकी पुष्टि या दोबारा खोलना विभाग के बाहर का कोई व्यक्ति करेगा।',
  'Your details are saved.': 'आपकी जानकारी सहेज ली गई।',
  'Your institution could not be found.': 'आपका संस्थान नहीं मिला।',
  'Your offer has been sent to the team.': 'आपका प्रस्ताव टीम को भेज दिया गया।',
  'Your report has been received.': 'आपकी रिपोर्ट मिल गई है।',
  'Your role cannot invite people.': 'आपकी भूमिका से लोगों को आमंत्रित नहीं किया जा सकता।',
};

const RATE_LIMITED_WHAT: Record<string, string> = {
  'attempts on this report': 'इस रिपोर्ट पर बहुत ज़्यादा कोशिशें हुईं।',
  'invitation attempts': 'बहुत ज़्यादा आमंत्रण भेजे गए।',
  'reports this hour': 'इस घंटे बहुत ज़्यादा रिपोर्टें दर्ज हुईं।',
  uploads: 'बहुत ज़्यादा फ़ाइलें अपलोड हुईं।',
  attempts: 'बहुत ज़्यादा कोशिशें हुईं।',
};

const STATUS_HI = new Map(
  Object.values(STATUS_DEFINITIONS).map((status) => [status.labelEn, status.labelHi]),
);

const PATTERNS: [RegExp, (...groups: string[]) => string][] = [
  [
    /^Too many (.+)\. Please wait (\d+) minutes? and try again\.$/,
    (what, minutes) =>
      `${RATE_LIMITED_WHAT[what] ?? 'बहुत ज़्यादा कोशिशें हुईं।'} कृपया ${minutes} मिनट रुककर फिर कोशिश करें।`,
  ],
  [/^Files must be under (\d+) MB\.$/, (mb) => `फ़ाइल ${mb} MB से छोटी होनी चाहिए।`],
  [/^Proposal version (\d+) saved\.$/, (version) => `प्रस्ताव का संस्करण ${version} सहेजा गया।`],
  [
    /^This invitation expired on (.+)\. Ask whoever invited you to send a new one\.$/,
    (when) => `यह आमंत्रण ${when} को समाप्त हो गया। आमंत्रित करने वाले से नया भेजने को कहें।`,
  ],
  [
    /^Something went wrong on our side\. Please try again; if it keeps happening, quote reference (.+)\.$/,
    (reference) =>
      `गड़बड़ी हमारी तरफ़ से हुई है। कृपया फिर से कोशिश करें। अगर बार-बार ऐसा हो, तो संदर्भ ${reference} बताएँ।`,
  ],
  [
    /^A report that is "(.+)" cannot move directly to "(.+)"\.$/,
    (from, to) =>
      `“${STATUS_HI.get(from) ?? from}” स्थिति वाली रिपोर्ट सीधे “${STATUS_HI.get(to) ?? to}” में नहीं जा सकती।`,
  ],
];

export function toHindi(message: string): string {
  const exact = HINDI[message];
  if (exact) return exact;
  for (const [pattern, render] of PATTERNS) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  return message;
}

export const HINDI_MESSAGES: Readonly<Record<string, string>> = HINDI;
