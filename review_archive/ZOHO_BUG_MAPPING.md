# Zoho Historical Bug Mapping

Generated from `config/zohoBugMap.js` (source: `CEP_TestCases/Zoho_Bugs_TeachMode.xlsx`) by `scripts/generate-zoho-mapping-doc.js`. Re-run that script after updating `matchedTestId` entries in the config file, rather than hand-editing this file directly.

**620 Teach Mode bugs** (in this suite's scope) + **73 excluded Plan Mode bugs** (out of scope, kept for reference) = 693 total, from the original 693-bug Zoho export.

**64 currently open** (To do / Reopened / Ready for Testing / On Hold) of the 620 Teach Mode bugs. **1 matched to a live-verifying Playwright test so far.**

Within each module below, currently-open bugs are listed first (bold status), then by priority.

## Summary by module

| Module                                                              | Total | Open | Matched |
| ------------------------------------------------------------------- | ----- | ---- | ------- |
| Playlist                                                            | 99    | 11   | 0       |
| Attendance                                                          | 91    | 0    | 0       |
| Players (Checkpoint)                                                | 78    | 3    | 0       |
| Authentication / Sign-In                                            | 70    | 13   | 0       |
| Unclassified / Needs Review                                         | 67    | 14   | 0       |
| Whiteboard                                                          | 49    | 7    | 1       |
| Magnet (entry point -> Attendance/Homework/Notices/Learning Shorts) | 26    | 0    | 0       |
| Ops / Infra (non-UI)                                                | 26    | 3    | 0       |
| Players (Quiz)                                                      | 22    | 2    | 0       |
| Toolbar                                                             | 16    | 0    | 0       |
| Compass (AfL Reports)                                               | 14    | 3    | 0       |
| Grade / Subject / Division                                          | 13    | 1    | 0       |
| Compass                                                             | 12    | 2    | 0       |
| Players (Code Editor)                                               | 12    | 0    | 0       |
| Players (Worksheet)                                                 | 5     | 0    | 0       |
| AI Assist                                                           | 3     | 0    | 0       |
| AI Homework                                                         | 3     | 1    | 0       |
| AI Notices                                                          | 3     | 0    | 0       |
| Drop It                                                             | 3     | 2    | 0       |
| Add Resource                                                        | 2     | 0    | 0       |
| Core UI                                                             | 2     | 0    | 0       |
| TCE Search Library                                                  | 2     | 1    | 0       |
| Players (Ebook)                                                     | 1     | 1    | 0       |
| User Profile                                                        | 1     | 0    | 0       |

---

## Teach Mode bugs, by module

### Playlist (99)

| Zoho ID    | Title                                                                                                  | Priority | Status                | Matched test |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------- | --------------------- | ------------ |
| TCN-I16302 | V1-Extra Spacing Displayed Between the First and Second Words of the Question Text                     | Highest  | **To do**             | —            |
| TCN-I16397 | V1-Questions Are Displayed Multiple Times in the Quiz Player                                           | Highest  | **Ready for Testing** | —            |
| TCN-I16404 | V1-Video Resources Do Not Open and Remain Stuck on Continuous Loading                                  | Highest  | **To do**             | —            |
| TCN-I16669 | V1-Figure/Diagram is missing from the question displayed in Teach Play Quiz                            | Highest  | **Reopened**          | —            |
| TCN-I17050 | Unable to Load Playlist Content                                                                        | Highest  | **Reopened**          | —            |
| CWR-I768   | Previous Class/Subject Playlist Content Persists After Switching Context in V1                         | High     | **To do**             | —            |
| TCN-I15358 | Diagram Activity – Solution Button Not Working (No Action Triggered)                                   | High     | **To do**             | —            |
| TCN-I16290 | Question Text Is Not Properly Aligned with Image                                                       | High     | **To do**             | —            |
| TCN-I15331 | PDF Files Not Opening in Class 1B While Working in Other Classes                                       | Medium   | **To do**             | —            |
| TCN-I15348 | Rightmost resource fails to load in Class 10A Science 10.2                                             | Medium   | **To do**             | —            |
| TCN-I15351 | Topic "2" under Chapter "10" does not load content and displays blank screen                           | Medium   | **To do**             | —            |
| CWR-I1547  | AI Assist displays “You have surpassed the school’s allowable limits” even after token extension       | Highest  | QA Sign off/Closed    | —            |
| CWR-I275   | Chapter, Subject & TP data sometimes fail to load — Ghost loader runs continuously                     | Highest  | QA Sign off/Closed    | —            |
| CWR-I306   | V2-Custom Chapter, Topic, and Resources Added in Web V1 Are Not Visible in V2.                         | Highest  | QA Sign off/Closed    | —            |
| CWR-I329   | Interactivity in IFP Not Responsive (CEP Web V2)                                                       | Highest  | Invalid               | —            |
| CWR-I332   | CEP Web V2: Quiz Opens Instead of Deleting from Playlist.                                              | Highest  | QA Sign off/Closed    | —            |
| CWR-I333   | Finish Editing & Pin Buttons Overlapping in Playlist Edit Mode in V1 and V2.                           | Highest  | QA Sign off/Closed    | —            |
| CWR-I335   | V2 - Incorrect Chapter and Topic Name Display launching Lesson Plan.                                   | Highest  | QA Sign off/Closed    | —            |
| CWR-I345   | V2-Grade selection dropdown closes prematurely when changing grade & subject                           | Highest  | QA Sign off/Closed    | —            |
| CWR-I352   | V2-Grade 8A Science Videos Stuck in Loading State.                                                     | Highest  | QA Sign off/Closed    | —            |
| CWR-I546   | Play and Pause button labels appear on the left side outside the video player                          | Highest  | QA Sign off/Closed    | —            |
| CWR-I552   | eBook content overlaps with resource tray bar, making topic name unreadable                            | Highest  | Invalid               | —            |
| CWR-I626   | Previous TOC Displayed in eBook After Changing Grade and Subject                                       | Highest  | QA Sign off/Closed    | —            |
| CWR-I651   | Edit Button Not Working for Resource in playlist                                                       | Highest  | QA Sign off/Closed    | —            |
| CWR-I658   | Code file/assets are not opening in Library under add resource                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I14949 | Baseline Test Topic Not Displayed for Grade 7 C                                                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I14977 | Baseline topic not displayed initially for Grade 8 – appears only after changing chapter               | Highest  | QA Sign off/Closed    | —            |
| TCN-I14982 | Create Test button is disabled even when baseline topic is available for the subject                   | Highest  | QA Sign off/Closed    | —            |
| TCN-I15339 | Error "No Valid Question Found" displayed when opening Exercise from Playlist (Grade 10A Math 10.2)    | Highest  | QA Sign off/Closed    | —            |
| TCN-I15835 | Question Does Not Change Consistently When Navigating Using the Question Navigation Panel              | Highest  | Invalid               | —            |
| TCN-I15871 | Show Answer Cannot Be Hidden and Display State Persists Across Question Navigation                     | Highest  | QA Sign off/Closed    | —            |
| TCN-I15909 | Navigation Arrows Are Not Working in Quiz Player                                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I15970 | V1-CBA Question Does Not Update on Navigation Panel During Question Navigation                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16079 | PDF Annotation Not Working After Zooming                                                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I16109 | Quiz Player Does Not Open After Client Is Left Open for More Than 1 Hour                               | Highest  | Invalid               | —            |
| TCN-I16110 | Expand Icon Overlaps Question Content in Quiz Player                                                   | Highest  | QA Sign off/Closed    | —            |
| TCN-I16132 | CBA Question Indicators Are Displayed in Regular Quiz Navigation                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16135 | Image Expands on Click Even When Expand Icon Is Not Displayed                                          | Highest  | QA Sign off/Closed    | —            |
| TCN-I16136 | Expanded Image Appears Pixelated in Quiz Player                                                        | Highest  | Invalid               | —            |
| TCN-I16139 | Background Lines Appear While Panning PDF in Client                                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16161 | V1-Fraction Values Are Not Rendered Correctly in Case Study and Question Screen for CBA Question       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16185 | Option Images Are Not Displayed in Quiz Player                                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16186 | Question Content Is Not Displayed in Quiz Player                                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16310 | V1-Image Is Not Displayed in "Exercise"Resource Content; Broken Image Placeholder Is Shown             | Highest  | QA Sign off/Closed    | —            |
| TCN-I16318 | V1-Vertical Scroll Bar Is Missing for Long Questions in Question View                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I16320 | V1-Blank Screen Is Displayed for Exercise Containing Only Open-Ended Questions                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16321 | V1-Mathematical Equation Formatting Is Broken in Question View                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16576 | V1-Question Fails to Load in Lesson Player Due to Invalid Question Request                             | Highest  | Closed                | —            |
| TCN-I16596 | AI Assist Not Working – 503 Service Unavailable Error                                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I16652 | Success message is not displayed after deleting saved code in V2 Code Editor/other resource            | Highest  | QA Sign off/Closed    | —            |
| TCN-I16684 | Question Lacks Sufficient Context for Reference                                                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I16691 | after attendance opening - Play Quiz opens in mini size for Mitochondria topic                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16693 | Play Quiz displays the same question repeatedly                                                        | Highest  | Closed                | —            |
| TCN-I16702 | Image is displayed above the text and is not centered                                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I16703 | WebDrop – Video Saved to Playlist Is Not Working                                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16704 | WebDrop – Image Saved to Playlist Is Not Working                                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16794 | Video Player Displays Content Too Small                                                                | Highest  | QA Sign off/Closed    | —            |
| TCN-I16802 | V1-Asset Playback Fails with Loading Player Error                                                      | Highest  | QA Sign off/Closed    | —            |
| CWR-I272   | Widgets are incorrectly showing up in the Playlist                                                     | High     | Invalid               | —            |
| CWR-I276   | Geography map assets are incorrectly appearing as widgets in the Playlist                              | High     | Invalid               | —            |
| CWR-I353   | Mismatch in Question Count Between CEP Android and CEP Web in “Play Quiz”                              | High     | QA Sign off/Closed    | —            |
| CWR-I362   | V2-“Submit Answer” Button Displayed Twice and Overlapping in Exercise Resource                         | High     | Invalid               | —            |
| CWR-I382   | V1-“Finish Editing” Text Overlapping on Pin Icon/CTA                                                   | High     | QA Sign off/Closed    | —            |
| CWR-I525   | DropIt / AI Assist Window Remains Open After Auto Logout and Does Not Close Properly                   | High     | QA Sign off/Closed    | —            |
| CWR-I533   | Quiz is not removed after clicking “X” button (Delete/Remove action not working)                       | High     | QA Sign off/Closed    | —            |
| CWR-I548   | Words Breaking Incorrectly Across Lines in Question Content                                            | High     | QA Sign off/Closed    | —            |
| CWR-I549   | Resource titles are breaking mid-word in content cards                                                 | High     | QA Sign off/Closed    | —            |
| CWR-I550   | Chapter page does not open after clicking chapter from TOC                                             | High     | QA Sign off/Closed    | —            |
| CWR-I612   | CBA Question Content Rendering Issue – Text and Numbers Misaligned                                     | High     | QA Sign off/Closed    | —            |
| CWR-I625   | Widgets Displayed Under Playlist Are Not Opening                                                       | High     | QA Sign off/Closed    | —            |
| CWR-I630   | “Unknown Question Type” Displayed on Accessing Exercise File in Chapter Resources                      | High     | QA Sign off/Closed    | —            |
| CWR-I656   | Widget Tool State Not Maintained Across Topic Navigation in V2                                         | High     | Duplicate             | —            |
| CWR-I659   | “Same Question” Button Loads New Question Even When Both Panels Already Show Same Question             | High     | QA Sign off/Closed    | —            |
| CWR-I660   | Navigation arrow color not updating in Play Quiz                                                       | High     | QA Sign off/Closed    | —            |
| CWR-I711   | Text not visible on Launch AI Card screen due to white text on white background                        | High     | QA Sign off/Closed    | —            |
| CWR-I731   | Success message not displayed after adding resource from playlist                                      | High     | QA Sign off/Closed    | —            |
| CWR-I733   | Action buttons hidden on Tool/Widget screen – only content visible                                     | High     | QA Sign off/Closed    | —            |
| CWR-I734   | Resource Tray overlaps on Widget screen when opened from Explore it                                    | High     | QA Sign off/Closed    | —            |
| CWR-I737   | Edited resource title not updated – old title still displayed                                          | High     | QA Sign off/Closed    | —            |
| TCN-I15363 | Unnecessary topic "iemh101.pdf" appears during navigation in Class 9A Mathematics                      | High     | QA Sign off/Closed    | —            |
| TCN-I15365 | Incorrect Topic Serial Number Displayed in TOC Navigation                                              | High     | Invalid               | —            |
| TCN-I15369 | Topic name displays HTML encoded apostrophe (&#39;) instead of a proper ' character.                   | High     | QA Sign off/Closed    | —            |
| TCN-I15832 | 00114855 Images Not Displayed for Image-Based Questions in Chapter Resources TP Quiz Player            | High     | QA Sign off/Closed    | —            |
| TCN-I16028 | Custom Quiz Does Not Close When Clicking the Close (×) Button                                          | High     | QA Sign off/Closed    | —            |
| TCN-I16286 | Question Image Is Displayed Multiple Times                                                             | High     | Invalid               | —            |
| TCN-I16287 | Question Image Is Not Loading                                                                          | High     | QA Sign off/Closed    | —            |
| TCN-I16288 | Question Image Opens in Full Screen                                                                    | High     | QA Sign off/Closed    | —            |
| TCN-I16289 | Option Images Are Not Properly Aligned                                                                 | High     | Invalid               | —            |
| TCN-I16292 | Inconsistent Image Preview Behavior in Quiz Player                                                     | High     | QA Sign off/Closed    | —            |
| CWR-I259   | Playlist Assets Always Open at Default Position                                                        | Medium   | QA Sign off/Closed    | —            |
| CWR-I264   | Slow and Inefficient Asset Movement in Playlist Due to Forced Scroll Animation                         | Medium   | QA Sign off/Closed    | —            |
| CWR-I544   | Grade 8 Science Chapter 2 – Backward Navigation Button Not Working                                     | Medium   | QA Sign off/Closed    | —            |
| CWR-I545   | Grade 8 Science Chapter 2 – Incorrect Playlist Label Showing as 3.1                                    | Medium   | QA Sign off/Closed    | —            |
| CWR-I762   | Battery Voltage widget displays browser error in Grade 7C Science Chapter 3.2                          | Medium   | Invalid               | —            |
| TCN-I15342 | Big Idea Videos Not Displayed for Grade 8 Science Topic                                                | Medium   | QA Sign off/Closed    | —            |
| TCN-I15366 | [For General Knowledge] JLNP touch not working on IFP (mouse working) – Grade 9 Science Practical 13.1 | Medium   | Done                  | —            |
| TCN-I15389 | “State Spelling” Displayed Incorrectly as “Satte” in Question Stem                                     | Medium   | QA Sign off/Closed    | —            |
| TCN-I16699 | Unsupported Files Added by User Cannot Be Downloaded or Previewed in the Application                   | Medium   | QA Sign off/Closed    | —            |
| TCN-I15357 | Topic Resources Mismatch – Incorrect/Incomplete Resources Displayed (Class 10A Science)                | Lowest   | Invalid               | —            |

### Attendance (91)

| Zoho ID    | Title                                                                                                     | Priority | Status             | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I313   | Attendance Submission Not Reflecting Changes                                                              | Highest  | QA Sign off/Closed | —            |
| CWR-I323   | Single student details duplicated during ongoing attendance.                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I15133 | Attendance Module Shows “No Student Found / Failed to Load Student Data”                                  | Highest  | QA Sign off/Closed | —            |
| TCN-I15135 | Student Roll Numbers Not Displayed in CEP Attendance; Blank Roll Number Columns and Student Cards         | Highest  | QA Sign off/Closed | —            |
| TCN-I15137 | Audio Not Played for Few Students During Play Attendance on IFP                                           | Highest  | QA Sign off/Closed | —            |
| TCN-I15138 | Resume Attendance Starts from First Student Instead of Last Progress                                      | Highest  | QA Sign off/Closed | —            |
| TCN-I15139 | Blank Screen Appears Instead of Resume Attendance Popup After Closing Play Attendance                     | Highest  | QA Sign off/Closed | —            |
| TCN-I15140 | Attendance Module Not Displayed for Grade 8 A Teacher                                                     | Highest  | QA Sign off/Closed | —            |
| TCN-I15153 | “Play Attendance” and “Mark Attendance” CTAs Missing on Start Attendance Screen                           | Highest  | QA Sign off/Closed | —            |
| TCN-I15158 | Attendance Audio Continues Playing When Close Confirmation Popup Appears                                  | Highest  | QA Sign off/Closed | —            |
| TCN-I15159 | Student Name Text Overflow/Misalignment Within Badge (First and Last Characters Clipped)                  | Highest  | QA Sign off/Closed | —            |
| TCN-I15165 | Attendance Shows as Pending with Blank Screen & Blocked Content Message                                   | Highest  | QA Sign off/Closed | —            |
| TCN-I15176 | Mismatch in Total Student Count vs Displayed Attendance Roll Numbers                                      | Highest  | QA Sign off/Closed | —            |
| TCN-I15179 | Attendance Report Panel Not Displayed When All Students Are Marked Present                                | Highest  | QA Sign off/Closed | —            |
| TCN-I15182 | Same Student List Populated During Attendance When Changing Class/Division Within the Same Grade          | Highest  | QA Sign off/Closed | —            |
| TCN-I15185 | Unknown Student Name Displayed in Birthday Pop-up & Correct Student Name Not Shown During Auto Attendance | Highest  | QA Sign off/Closed | —            |
| TCN-I15189 | Middle Roll Numbers Not Marked Present When Selecting First and Last Roll Number in Mark Attendance       | Highest  | QA Sign off/Closed | —            |
| TCN-I15190 | Edit Attendance Button Missing After Submitting Attendance and Reopening Attendance Module                | Highest  | QA Sign off/Closed | —            |
| TCN-I15192 | Duplicate Birthday Popup Displayed After Submitting Attendance and Re-selecting Attendance Module         | Highest  | QA Sign off/Closed | —            |
| TCN-I15193 | On Birthday Popup – Current Date, “Happy Birthday” Title, and Event Details Not Displayed                 | Highest  | QA Sign off/Closed | —            |
| TCN-I15194 | Attendance Module Not Available/Displayed in CEP-Magnet Module                                            | Highest  | QA Sign off/Closed | —            |
| TCN-I15195 | Speed Options Not Dismissing After Selection During Attendance.                                           | Highest  | QA Sign off/Closed | —            |
| TCN-I15196 | In Mark Attendance No Confirmation Prompt on Closing Attendance Window.                                   | Highest  | QA Sign off/Closed | —            |
| TCN-I15197 | Absent Students Overlapping Behind Student Names.                                                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15198 | Attendance Window Displays Blank After Playing Resource Video.                                            | Highest  | QA Sign off/Closed | —            |
| TCN-I15199 | In V2 Web Attendance, Date Missing on Top-Right Corner During Ongoing Attendance.                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15200 | In V2 Web Attendance, Student Name & Roll Number Box Stuck at Right Corner During Ongoing Attendance.     | Highest  | QA Sign off/Closed | —            |
| TCN-I15201 | Attendance date navigation stuck on past date and updates unevenly                                        | Highest  | QA Sign off/Closed | —            |
| TCN-I15202 | Birthday Wish Song Not Playing in Attendance Module                                                       | Highest  | QA Sign off/Closed | —            |
| TCN-I15203 | Attendance Modification Allowed for Past Dates in CEP Web V2.                                             | Highest  | QA Sign off/Closed | —            |
| TCN-I15204 | Voice (Mute/Unmute) button missing in attendance window                                                   | Highest  | QA Sign off/Closed | —            |
| TCN-I15205 | Current date UI overlaps with attendance navigation window during ongoing attendance.                     | Highest  | QA Sign off/Closed | —            |
| TCN-I15206 | Attendance disappears while navigating students during active attendance session.                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15207 | Mark Attendance Window Background Displays Blank                                                          | Highest  | QA Sign off/Closed | —            |
| TCN-I15208 | Current Date Birthday Not Displaying Before Attendance Starts.                                            | Highest  | QA Sign off/Closed | —            |
| TCN-I15209 | Attendance Window Not Fully Displaying & Resource Bar Not Clickable                                       | Highest  | QA Sign off/Closed | —            |
| TCN-I15211 | Attendance Background Window Displays Blank.                                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I15867 | Student Name Badges Overlap Each Other on Birthday Celebration Screen                                     | Highest  | QA Sign off/Closed | —            |
| TCN-I15869 | Attendance Status Incorrectly Displayed as "Submitted" Without Marked Attendance                          | Highest  | Closed             | —            |
| TCN-I15982 | Range selection does not work after resuming an incomplete attendance session                             | Highest  | Invalid            | —            |
| TCN-I16022 | Previous and Next buttons remain enabled during attendance playback                                       | Highest  | QA Sign off/Closed | —            |
| TCN-I16256 | Error Occurs While Closing Attendance                                                                     | Highest  | QA Sign off/Closed | —            |
| TCN-I16270 | Attendance UI Is Broken                                                                                   | Highest  | QA Sign off/Closed | —            |
| TCN-I16281 | Attendance Audio Plays for Subject Teacher, but Attendance Card/CTA Is Not Displayed                      | Highest  | QA Sign off/Closed | —            |
| TCN-I16298 | Duplicate Attendance Screen Appears for Subject Teacher While Attendance Reminder Is Playing              | Highest  | QA Sign off/Closed | —            |
| TCN-I16577 | Error Occurs When Closing/Submitting Attendance Session Midway                                            | Highest  | Invalid            | —            |
| TCN-I16793 | Unable to Submit Attendance                                                                               | Highest  | QA Sign off/Closed | —            |
| TCN-I16939 | Newly Added Students Are Displayed as Blank Entries in Attendance                                         | Highest  | Invalid            | —            |
| TCN-I16991 | Attendance remains stuck on loading due to failed attendance API request                                  | Highest  | QA Sign off/Closed | —            |
| TCN-I16997 | Attendance Module Overrides Whiteboard CSS                                                                | Highest  | QA Sign off/Closed | —            |
| TCN-I15134 | Birthday icon not displayed on attendance ring in student card                                            | High     | QA Sign off/Closed | —            |
| TCN-I15136 | Date Tabs Missing on Student Name Card for Attendance (Current + Last 2 Days)                             | High     | QA Sign off/Closed | —            |
| TCN-I15141 | Changes in Attendance by Teacher in TC Not Reflected in CEP;                                              | High     | QA Sign off/Closed | —            |
| TCN-I15142 | Cake Icon Not Properly Visible on Attendance Ring in IFP Panel                                            | High     | QA Sign off/Closed | —            |
| TCN-I15143 | Resume Attendance Pop-up Appears on Start Attendance Screen Instead of Play Attendance Screen             | High     | QA Sign off/Closed | —            |
| TCN-I15144 | Incorrect Success Message Displayed After Submitting Attendance                                           | High     | QA Sign off/Closed | —            |
| TCN-I15145 | Student Name Repeats on Resume and Attendance Ring Color Changes Incorrectly                              | High     | QA Sign off/Closed | —            |
| TCN-I15146 | No Auto-Scroll After Clicking “Mark All Present” on Mark Attendance Screen                                | High     | QA Sign off/Closed | —            |
| TCN-I15147 | Inconsistent Range Selection Behavior While Marking Attendance                                            | High     | QA Sign off/Closed | —            |
| TCN-I15148 | Birthday Pop-up Cake Image Partially Visible                                                              | High     | QA Sign off/Closed | —            |
| TCN-I15149 | Play Attendance Screen Loads Before Birthday Pop-up                                                       | High     | QA Sign off/Closed | —            |
| TCN-I15150 | Attendance Panel Not Automatically Visible After Marking Attendance (Manual Scrolling Required)           | High     | QA Sign off/Closed | —            |
| TCN-I15151 | Duplicate Screen Appears for while After Submitting Attendance                                            | High     | QA Sign off/Closed | —            |
| TCN-I15154 | Incorrect Success Message Displayed After Editing Attendance                                              | High     | QA Sign off/Closed | —            |
| TCN-I15155 | Attendance Screen Instruction Text Mismatch with Design                                                   | High     | QA Sign off/Closed | —            |
| TCN-I15156 | Right-Side Attendance Panel Partially Cut Off                                                             | High     | QA Sign off/Closed | —            |
| TCN-I15157 | Pending Tag Removed on Reattempt/Resume of Attendance                                                     | High     | QA Sign off/Closed | —            |
| TCN-I15160 | Content Overlap/Cut-off Due to Student Name Card on Birthday Screen                                       | High     | QA Sign off/Closed | —            |
| TCN-I15161 | Attendance Popup Incorrectly Repositions on Resource Tray Collapse                                        | High     | QA Sign off/Closed | —            |
| TCN-I15162 | Outer Frame Missing for Birthday Screen                                                                   | High     | QA Sign off/Closed | —            |
| TCN-I15163 | Center Card Appears Squarish Instead of Rectangular                                                       | High     | QA Sign off/Closed | —            |
| TCN-I15166 | Student Name Displayed Immediately Instead of After Cake Animation in Birthday Popup                      | High     | QA Sign off/Closed | —            |
| TCN-I15167 | “Edit Attendance” CTA Appears Before Submission Instead of After Submit                                   | High     | QA Sign off/Closed | —            |
| TCN-I15168 | Attendance Ring Animation Starts Midway Instead of From Beginning                                         | High     | QA Sign off/Closed | —            |
| TCN-I15169 | Card Animation Not Smooth – Abrupt Scaling and Jerky Movement                                             | High     | QA Sign off/Closed | —            |
| TCN-I15171 | Resume Attendance Functionality Missing with No Prompt Message                                            | High     | QA Sign off/Closed | —            |
| TCN-I15173 | Birthday Cake Icon Overlapping with Attendance Ring on Student Card                                       | High     | QA Sign off/Closed | —            |
| TCN-I15174 | Incorrect music Sequence on “Wish Birthday” Action                                                        | High     | QA Sign off/Closed | —            |
| TCN-I15177 | Attendance Report Panel Not Displayed on Edit Attendance Screen After Marking Student Absent              | High     | QA Sign off/Closed | —            |
| TCN-I15178 | Attendance Report Panel Overlaps Last Student Card Due to Excessive Gap from Current Date                 | High     | QA Sign off/Closed | —            |
| TCN-I15180 | “Mark All Present” and “Done” CTAs Missing on Mark Attendance Screen                                      | High     | QA Sign off/Closed | —            |
| TCN-I15181 | Playlist/Resource Screen Overlaps on Attendance Window                                                    | High     | QA Sign off/Closed | —            |
| TCN-I15184 | All Students Marked as Absent When User Closes Screen Without Submitting Attendance                       | High     | QA Sign off/Closed | —            |
| TCN-I15186 | Background Content Visible Through Speed Popup and Attendance Report Panel                                | High     | QA Sign off/Closed | —            |
| TCN-I15188 | First Student Name Announced on Play Screen Instead of Redirecting to Attendance List                     | High     | QA Sign off/Closed | —            |
| TCN-I15191 | Success Message Not Displayed After Submitting Attendance – Blank Screen Appears                          | High     | QA Sign off/Closed | —            |
| TCN-I15964 | Attendance playback UI breaks when a large number of students are marked absent                           | High     | QA Sign off/Closed | —            |
| TCN-I15965 | Current day's attendance status is not updated on the attendance                                          | High     | Invalid            | —            |
| TCN-I15966 | Attendance card displays outdated status after manually marking a student absent                          | High     | Invalid            | —            |
| TCN-I15187 | Student Names Not Displayed Properly in Birthday Celebration                                              | Medium   | QA Sign off/Closed | —            |
| TCN-I16143 | Absent Student List Overlaps Attendance Summary                                                           | Medium   | QA Sign off/Closed | —            |

### Players (Checkpoint) (78)

| Zoho ID    | Title                                                                                                     | Priority | Status                | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------ |
| TCN-I15255 | Avg. Correctness Score Displayed as 0% Despite 100% Topic Performance                                     | Highest  | **To do**             | —            |
| TCN-I16015 | V1-Baseline Concepts Displayed Under Grade 6 Syllabus Chapter List for Mathematics and Science            | Highest  | **To do**             | —            |
| TCN-I16551 | Create Test Button Enabled When Foundation Checkpoint Chapter Is Unavailable for Grade 9 Mathematics      | Highest  | **Ready for Testing** | —            |
| TCN-I14950 | Error Occurred While Launching Baseline Test Checkpoint                                                   | Highest  | Rejected              | —            |
| TCN-I14954 | Unable to Start Test After Roll Number Validation – “Failed to load test information” Error Displayed     | Highest  | Closed                | —            |
| TCN-I14955 | Unable to launch test in In-Lab Assessment Mode – 503 Error on Launch Test                                | Highest  | QA Sign off/Closed    | —            |
| TCN-I14968 | Duplicate Division Display on downloaded Student Register Register(Paper Test)                            | Highest  | QA Sign off/Closed    | —            |
| TCN-I14969 | Grade Data Not Reset on Change – Incorrect Chapters Shown and Test Creation Allowed                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I14970 | Create Test Button Visible/Enabled When No Checkpoint Available (Grade 6)                                 | Highest  | QA Sign off/Closed    | —            |
| TCN-I14972 | Math Questions Not Displayed Properly in Report – HTML Code Visible & Number Overlapping                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I14975 | Questions from secondarily selected topics are not displayed in View Details after publishing test        | Highest  | QA Sign off/Closed    | —            |
| TCN-I14984 | Resource Tray Overlapping on Checkpoint Launch Screen                                                     | Highest  | QA Sign off/Closed    | —            |
| TCN-I14995 | Total Marks Not Auto-Calculated in Excel Preview After Upload in Paper Test                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I14996 | No Validation Error When Uploading Excel with Marks Exceeding Assigned Marks in Paper Test                | Highest  | QA Sign off/Closed    | —            |
| TCN-I14998 | Excel Sheet Shows as Uploaded Even After Cancellation in Paper Test Mode                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I15000 | Marks Validation Missing While Uploading Evaluation Excel Sheet                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I15002 | Top-Down Scroll Not Working in Offline Test Excel Upload (Only Partial Students Visible)                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I15003 | Code Displayed Instead of Proper Title for Maths Reasoning and Assertion Questions                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I15011 | Student Test-Broken Image Displayed for Number Line Questions in Maths Baseline Test                      | Highest  | QA Sign off/Closed    | —            |
| TCN-I15012 | Student Screen – Grade/Class Data Not Loading and 500 Error on Roll Number Submission                     | Highest  | QA Sign off/Closed    | —            |
| TCN-I15013 | Baseline Test Card Visible and Topic Name Loading When SKU Module is Disabled                             | Highest  | QA Sign off/Closed    | —            |
| TCN-I15014 | CEP V2 – Critical Issues with Topic Loading, Grade Selection, and Incorrect Baseline Test Mapping         | Highest  | QA Sign off/Closed    | —            |
| TCN-I15015 | Incorrect skill status (green) shown for late-submitted test after checkpoint closure; report shows error | Highest  | QA Sign off/Closed    | —            |
| TCN-I15021 | Teacher cannot create baseline test if grade is not assigned                                              | Highest  | QA Sign off/Closed    | —            |
| TCN-I15022 | Test Corruption After Pause Error and Screen Refresh                                                      | Highest  | QA Sign off/Closed    | —            |
| TCN-I15023 | Details Report Not Displayed for Passed Student                                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I15026 | Student Test-User Redirected to Test Start Screen After Submission and Able to Restart Test               | Highest  | QA Sign off/Closed    | —            |
| TCN-I15029 | Teacher Unable to Launch Test – 500 Internal Server Error                                                 | Highest  | QA Sign off/Closed    | —            |
| TCN-I15030 | Revision/Student Test Displayed Under Concept Instead of Baseline Test Topic                              | Highest  | QA Sign off/Closed    | —            |
| TCN-I15031 | Baseline Test Topic Not Displayed Under Checkpoint Chapter, Unable to Launch Test                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I15093 | Concept Notes (Notes )Not Displayed for Some Concepts in Science Subject                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I15094 | Concept Notes(Content) Not Visible for Maths Subject Concept for grade 6,7 and 8                          | Highest  | QA Sign off/Closed    | —            |
| TCN-I15096 | Image Preview Not Displayed Properly – Text Overlap and Screen Gets Greyed Out                            | Highest  | QA Sign off/Closed    | —            |
| TCN-I15097 | Test name and subtext overlap with the student name and roll number in the student test view.             | Highest  | QA Sign off/Closed    | —            |
| TCN-I15254 | "UNKNOWN" Displayed Instead of Concept Name in Topic & Question Level Analysis Report                     | Highest  | QA Sign off/Closed    | —            |
| TCN-I15256 | Question Content Not Displayed Properly and Expand Button Not Working in Full Question Analysis           | Highest  | QA Sign off/Closed    | —            |
| TCN-I15655 | Unable to Launch Baseline Test and Student Test Login Page Fails to Load Grade/Class Data                 | Highest  | QA Sign off/Closed    | —            |
| TCN-I15937 | Broken Image Icon Displayed Instead of Number Line Diagram in Question Details post view question         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16012 | Foundation Checkpoint Chapter Missing for Science Subjects in Grades 8                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16051 | Revision Test popup persists after navigation and sign out                                                | Highest  | QA Sign off/Closed    | —            |
| TCN-I16228 | Revision Test Pop-up Does Not Close on First Click After Accessing Compass                                | Highest  | QA Sign off/Closed    | —            |
| TCN-I16249 | User Is Able to Start Multiple Baseline Tests Simultaneously for the Same Class, Division, and Subject    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16553 | Foundation Checkpoint Chapter Is Unavailable for Grade 9 Mathematics                                      | Highest  | QA Sign off/Closed    | —            |
| TCN-I16578 | Skills Gained Section Overlaps Concept Names on Mission Completed Screen                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I16579 | Baseline Test Topic Is Displayed as “Checkpoint” in Foundation Checkpoint Chapter for Grade 7 Science     | Highest  | QA Sign off/Closed    | —            |
| TCN-I16634 | School Logo Missing in Downloaded Baseline Assessment Paper                                               | Highest  | Invalid               | —            |
| TCN-I16635 | Academic Year Missing in Downloaded Student Register for Paper Test Mode                                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I16724 | Baseline Test/Start Checkpoint screen remains open after auto sign-out                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16744 | Created Baseline Tests are not displayed in OPS/Web Playlist for previously selected grade                | Highest  | QA Sign off/Closed    | —            |
| TCN-I16750 | Fraction Value Displayed as Incorrect Numeric Value in view details                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16752 | Correct options are displayed in bold in Baseline Test on Student Test                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16767 | Student roll number "3" is displayed but shows "Invalid Login" when entered                               | Highest  | Invalid               | —            |
| TCN-I16973 | Student Test-Question Image Is Displayed With a Broken Image Icon                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16974 | Roll Number Is Hidden on Student Test Result Screen                                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I17056 | Blank Question and Option Details Displayed for Baseline Test Created with Integer Topic                  | Highest  | QA Sign off/Closed    | —            |
| TCN-I17067 | Preview CTA Overlaps with Image-Based Question Text in Student Test                                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I17077 | Image Missing for Integer Concept Questions in View Details and Student Test                              | Highest  | QA Sign off/Closed    | —            |
| TCN-I17084 | Question ID Is Displayed Instead of Question Content While Creating Assessment                            | Highest  | QA Sign off/Closed    | —            |
| TCN-I17114 | Unable to Create Baseline Test for Mathematics Even for an Assigned Subject                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I14971 | Student Test Auto-Submitted Before Confirmation on “End Checkpoint”                                       | High     | QA Sign off/Closed    | —            |
| TCN-I15004 | Baseline Test Created with 0 Question Count Without Validation Message                                    | High     | QA Sign off/Closed    | —            |
| TCN-I15010 | Bar Graph – “Scale Line” Text Overlapping with Graph UI                                                   | High     | QA Sign off/Closed    | —            |
| TCN-I15016 | Student test-Nudges missing in student test; only astronaut image displayed without messages              | High     | QA Sign off/Closed    | —            |
| TCN-I15017 | “Class 6 Science concepts applied in Class 7” text overlapping on Question Frame UI                       | High     | QA Sign off/Closed    | —            |
| TCN-I15018 | Student able to attempt test even after test duration is over and checkpoint is ended by teacher          | High     | QA Sign off/Closed    | —            |
| TCN-I15020 | Baseline tests created for one grade are incorrectly displayed for another grade                          | High     | QA Sign off/Closed    | —            |
| TCN-I15024 | Test Status Shows “Created” Instead of “Paused” on Playlist After Teacher Pauses Test                     | High     | QA Sign off/Closed    | —            |
| TCN-I15025 | Timer Overlaps with Baseline Test Tag on Test Start Screen (Student Portal)                               | High     | QA Sign off/Closed    | —            |
| TCN-I15027 | Student Portal-“Not Attempted” Question Indicator Displayed Outside the Designated Section                | High     | QA Sign off/Closed    | —            |
| TCN-I15028 | Quiz File Not Displayed for First Topic/Concept                                                           | High     | QA Sign off/Closed    | —            |
| TCN-I15032 | Create Test Button Remains Disabled When Science Subject is Selected by Default                           | High     | QA Sign off/Closed    | —            |
| TCN-I15085 | White background visible around question image in Grade 6 Baseline Test                                   | High     | QA Sign off/Closed    | —            |
| TCN-I15090 | Incomplete question displayed and question title missing in Assessment Details                            | High     | QA Sign off/Closed    | —            |
| TCN-I16751 | Image background appears greyed out                                                                       | High     | QA Sign off/Closed    | —            |
| TCN-I14974 | User is able to edit roll number after confirmation                                                       | Medium   | QA Sign off/Closed    | —            |
| TCN-I14951 | Tick Mark Position Changes While Scrolling in View Details Popup                                          | Lowest   | QA Sign off/Closed    | —            |
| TCN-I14973 | 401 Error Displayed on Clicking “View Details”                                                            | Lowest   | QA Sign off/Closed    | —            |
| TCN-I15086 | Images are missing for Grade 6 Baseline Test questions in Symmetry chapter                                | Lowest   | QA Sign off/Closed    | —            |

### Authentication / Sign-In (70)

| Zoho ID    | Title                                                                                                 | Priority | Status             | Matched test |
| ---------- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I15320 | “$” symbol is displayed in the homework question content                                              | Highest  | **To do**          | —            |
| TCN-I16707 | V8 Client – Server Error Message Is Displayed                                                         | Highest  | **To do**          | —            |
| TCN-I16709 | V8 Client – Switching Between Profiles Is Not Working Properly                                        | Highest  | **To do**          | —            |
| TCN-I16923 | CEP V8 Client Becomes Unresponsive                                                                    | Highest  | **To do**          | —            |
| TCN-I16924 | Icons Not Loading in CEP V8 Client                                                                    | Highest  | **To do**          | —            |
| TCN-I16925 | Profile Not Loading in CEP V8 Client                                                                  | Highest  | **To do**          | —            |
| TCN-I16926 | Client V8 Experiences Lag                                                                             | Highest  | **To do**          | —            |
| TCN-I17045 | [00121020] Content Missing for Class 3, SST, Chapter 13                                               | Highest  | **To do**          | —            |
| TCN-I17046 | [120025] Content Automatically Erasing in Tata ClassEdge                                              | Highest  | **To do**          | —            |
| TCN-I17047 | [119231] Pen Annotation Not Working                                                                   | Highest  | **To do**          | —            |
| CWR-I767   | Erased Annotation Data Not Restored After Using Undo Post Re-login on V1 Whiteboard                   | High     | **To do**          | —            |
| TCN-I15338 | PDF Added from Library to Playlist Keeps Loading and Does Not Open                                    | Medium   | **On Hold**        | —            |
| TCN-I15344 | User on CEP V2 gets logged off multiple times within short duration                                   | Medium   | **To do**          | —            |
| CWR-I1538  | Air Card Popup Appears While Opening Quiz Player from Playlist                                        | Highest  | Invalid            | —            |
| CWR-I304   | V2 - Incorrect Interactive Count Displayed in Filter Resource on First Login.                         | Highest  | QA Sign off/Closed | —            |
| CWR-I317   | Attendance Window Persists After Session Timeout & Overlaps With Login PIN Window.                    | Highest  | QA Sign off/Closed | —            |
| CWR-I354   | V2-CBA TP Missing in CEP Chapter List – Unable to Test CBA Questions                                  | Highest  | QA Sign off/Closed | —            |
| CWR-I355   | Sales-Unable to login on CEP Sales,getting 404 error                                                  | Highest  | QA Sign off/Closed | —            |
| CWR-I417   | V2-Generated PIN Not Displayed in Set PIN Field but Visible in Console                                | Highest  | QA Sign off/Closed | —            |
| CWR-I451   | V2-New User Able to Set PIN Without Changing Default Password                                         | Highest  | QA Sign off/Closed | —            |
| CWR-I492   | CEP V2 – User Gets Forcefully Logged Out After Successful Login                                       | Highest  | QA Sign off/Closed | —            |
| CWR-I500   | Grade and Subject Keep Loading Continuously After Login                                               | Highest  | QA Sign off/Closed | —            |
| CWR-I750   | Unable to Reset Password for Teacher from Admin Panel – Incorrect Error Message                       | Highest  | QA Sign off/Closed | —            |
| CWR-I751   | Sync Functionality Not Working from Admin Panel                                                       | Highest  | QA Sign off/Closed | —            |
| CWR-I760   | Whiteboard data is not saved when switching topics immediately after writing                          | Highest  | QA Sign off/Closed | —            |
| TCN-I14983 | Duplicate Division Display and Errors on Student Login Screen                                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15247 | Compass CTA Not Displayed on First Login                                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I15319 | Sales-Text Feature of Whiteboard Is Not Getting Auto-Saved in User Login                              | Highest  | QA Sign off/Closed | —            |
| TCN-I15445 | Session Timeout Popup Appears Before 15 Minutes of Inactivity                                         | Highest  | Invalid            | —            |
| TCN-I15587 | Mathematical Symbols/Placeholders Displayed in Quiz Instead of Proper Content                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15589 | Whiteboard Pan Action Affecting Previous Topic                                                        | Highest  | QA Sign off/Closed | —            |
| TCN-I15777 | Air Card Working on IFP Devices Without Camera                                                        | Highest  | QA Sign off/Closed | —            |
| TCN-I15887 | Incorrect Teacher Details Displayed in Academic Details                                               | Highest  | QA Sign off/Closed | —            |
| TCN-I15985 | Prod-"carr/arrow" Text Displayed Instead of Close Arrow CTA on Login Page Loading                     | Highest  | QA Sign off/Closed | —            |
| TCN-I15986 | Sales- CEP URL Does Not Open in Regular Google Chrome Window but Opens Successfully in Incognito Mode | Highest  | Invalid            | —            |
| TCN-I16040 | Disable Keyboard setting and keyboard button are not working properly on the Sign In page             | Highest  | Invalid            | —            |
| TCN-I16111 | Page Scrolls Unnecessarily When Opening Answer Dropdown in Quiz Player                                | Highest  | QA Sign off/Closed | —            |
| TCN-I16210 | Session Times Out Within 5 Minutes During Active Usage                                                | Highest  | Invalid            | —            |
| TCN-I16319 | Whiteboard "Save as PDF" Functionality Not Working on IFP                                             | Highest  | QA Sign off/Closed | —            |
| TCN-I16381 | Text Box Content Is Missing After Saving Whiteboard as Playlist                                       | Highest  | QA Sign off/Closed | —            |
| TCN-I16454 | Whiteboard Text Is Missing in Shared PDF                                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I16726 | Image can be dragged from WebDrop into CEP without login                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I16727 | Video Can Be Added to CEP via WebDrop Without Login                                                   | Highest  | QA Sign off/Closed | —            |
| TCN-I16976 | PIN Login Shows “Next Step Required” After Admin Password Reset                                       | Highest  | QA Sign off/Closed | —            |
| CWR-I1530  | Whiteboard Text Not Retrieved After Quick Sign Out and Re-Login                                       | High     | Invalid            | —            |
| CWR-I281   | User Not Signed Out After Session Expiry and Manual Sign-Out Fails                                    | High     | QA Sign off/Closed | —            |
| CWR-I422   | V2-Session Token Expires Instead of Refreshing; Causes Logout or UI Freeze During Mode Switching      | High     | Invalid            | —            |
| CWR-I643   | Unable to Create Custom Chapter in V2 – No Action Performed on Clicking “Add Chapter”                 | High     | QA Sign off/Closed | —            |
| CWR-I689   | User is automatically logged off during an active session                                             | High     | Duplicate          | —            |
| CWR-I712   | Playlist panel overlaps split-screen quiz view and close buttons                                      | High     | QA Sign off/Closed | —            |
| CWR-I743   | Updated asset order not reflected after editing playlist in CEP V2                                    | High     | QA Sign off/Closed | —            |
| CWR-I745   | Feedback option missing in Profile section in CEP V2                                                  | High     | QA Sign off/Closed | —            |
| TCN-I14980 | No confirmation/message displayed on logout                                                           | High     | QA Sign off/Closed | —            |
| TCN-I15322 | Ebook continuously loading and not displayed in CEP V2                                                | High     | QA Sign off/Closed | —            |
| TCN-I15382 | Content Preview Not Visible in Satellite/Minimap in Some Scenarios                                    | High     | QA Sign off/Closed | —            |
| TCN-I15969 | Incomplete attendance is not shown as Pending                                                         | High     | Invalid            | —            |
| TCN-I16282 | Previous User Session Is Retained After Reopening the Client                                          | High     | QA Sign off/Closed | —            |
| CWR-I286   | Opened assets remain open after auto sign-out                                                         | Medium   | QA Sign off/Closed | —            |
| CWR-I554   | Profile screen not loading                                                                            | Medium   | QA Sign off/Closed | —            |
| CWR-I696   | User Gets Logged Out Suddenly During Active Session                                                   | Medium   | Duplicate          | —            |
| CWR-I701   | User gets logged off from platform during session and redirected to Sign In screen                    | Medium   | Invalid            | —            |
| CWR-I704   | User is automatically logged off from CEP during session                                              | Medium   | Duplicate          | —            |
| CWR-I707   | Resource Displays "No valid question found" Message in Demo for Class 7 Science Chapter 10.4          | Medium   | Duplicate          | —            |
| TCN-I15340 | Resources open in reduced size instead of full screen focus                                           | Medium   | Closed             | —            |
| TCN-I15355 | Chapter Resources – Resources on Right Panel Not Opening                                              | Medium   | Closed             | —            |
| TCN-I15381 | Text Box Size Changes After Sign Out and Sign In in Whiteboard                                        | Medium   | QA Sign off/Closed | —            |
| TCN-I15383 | Satellite/Minimap Popup Persists During Topic Switch and Sign Out                                     | Medium   | Invalid            | —            |
| TCN-I15384 | Centered Toolbar Moves to Top and Becomes Inaccessible After Re-Login on IFP                          | Medium   | Invalid            | —            |
| TCN-I15385 | Satellite/Minimap Preview Remains Visible After Logout Without Closing Popup                          | Medium   | Invalid            | —            |
| TCN-I15356 | CEP Login Failure – “Something went wrong, please try again” Error                                    | Lowest   | Closed             | —            |

### Unclassified / Needs Review (67)

| Zoho ID    | Title                                                                                                                     | Priority | Status                | Matched test |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------ |
| TCN-I15251 | Resources Not Displayed for Some Mathematics Topics                                                                       | Highest  | **Reopened**          | —            |
| TCN-I15380 | Table displayed without borders in CEP Statistics question                                                                | Highest  | **Reopened**          | —            |
| TCN-I16701 | WebDrop – Drop Text functionality is not working                                                                          | Highest  | **To do**             | —            |
| TCN-I16708 | V8 Client – Profile Save Button Remains Disabled                                                                          | Highest  | **To do**             | —            |
| TCN-I16753 | Images missing for “Data Through Picture” concept questions                                                               | Highest  | **Reopened**          | —            |
| TCN-I17060 | 118637-No sound clips for wild animals                                                                                    | Highest  | **To do**             | —            |
| TCN-I17064 | 109279-Screen timeout issue during annotation                                                                             | Highest  | **To do**             | —            |
| TCN-I15359 | Diagram Activity – Unable to Drag and Drop Labels (Excretory System)                                                      | High     | **To do**             | —            |
| TCN-I16558 | V1-Incorrect Success Message Displayed After Updating Custom Resource                                                     | High     | **Ready for Testing** | —            |
| TCN-I15328 | Incomplete/Improper Question Content Display in ASA Criteria Screen                                                       | Medium   | **To do**             | —            |
| TCN-I15329 | Incorrect Question Displayed and Repeated Across All Exercises                                                            | Medium   | **To do**             | —            |
| TCN-I15332 | Teacher Notes and Tata Content Not Visible in Certain Classes                                                             | Medium   | **To do**             | —            |
| TCN-I15343 | Chapters panel appears automatically during session without user interaction                                              | Medium   | **To do**             | —            |
| TCN-I15345 | Resource opens but content remains stuck on loading screen                                                                | Medium   | **To do**             | —            |
| CWR-I289   | Unable to Share Recorded Learning Shot in CEP                                                                             | Highest  | QA Sign off/Closed    | —            |
| CWR-I298   | V2 - Set Square widget becomes unresponsive after few seconds, causing application freeze in CEP                          | Highest  | QA Sign off/Closed    | —            |
| CWR-I325   | Selected Text Style Not Reflecting on IFP (Web V2)                                                                        | Highest  | QA Sign off/Closed    | —            |
| CWR-I331   | CEP Web V2: Edit/Delete Buttons Overlapping Navigation Button                                                             | Highest  | QA Sign off/Closed    | —            |
| CWR-I338   | Error displayed while creating assignment                                                                                 | Highest  | QA Sign off/Closed    | —            |
| CWR-I423   | Video Resources Not Opening in V2 – Continuous Loading with 404/401 Errors                                                | Highest  | QA Sign off/Closed    | —            |
| CWR-I680   | Usage Report Not Loading for Current Date                                                                                 | Highest  | QA Sign off/Closed    | —            |
| TCN-I14963 | Image Is Displayed Below the Question on Double-Click in Student Test                                                     | Highest  | QA Sign off/Closed    | —            |
| TCN-I14976 | User is able to edit question count so question displayed as mismatched                                                   | Highest  | QA Sign off/Closed    | —            |
| TCN-I14979 | Mismatch in incorrect question attempt data between report and Excel export                                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I14989 | Mismatch in Class Display Between Test and View Report                                                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I14990 | Broken Images are displayed in view details                                                                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I14992 | Revision Assessment Tag Displayed Incorrectly for Baseline Test During Test Launch                                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I14993 | Incorrect Attempted Student Count Displayed as “0/0” on Test Card                                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I14994 | Reset Test Button Not Working Under Student’s Attempt Scores                                                              | Highest  | QA Sign off/Closed    | —            |
| TCN-I15370 | Exercise questions not displayed – “No valid question found” error shown on access                                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I15378 | "Submit Answer" button remains enabled after answer submission                                                            | Highest  | Closed                | —            |
| TCN-I15537 | Unable to Start Baseline Test – "Failed to Load Test Information" Error                                                   | Highest  | Invalid               | —            |
| TCN-I16095 | CEP V1 – Subjective Questions Are Not Displayed                                                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I16096 | CEP V1 – Images in Subjective Questions Fail to Load/Broken Image is displayed.                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I17061 | 114938-User not able to delete custom asset                                                                               | Highest  | QA Sign off/Closed    | —            |
| CWR-I285   | Filter resource list appears every time user opens any asset after clicking "Filter Resource"                             | High     | QA Sign off/Closed    | —            |
| CWR-I379   | V1-CEP-CBA:“Show Answer” button is displayed for CBA when Case Study screen is open                                       | High     | QA Sign off/Closed    | —            |
| CWR-I380   | V1-CEP-CBA:Blank screen displayed when user clicks on “Show Answer” button                                                | High     | QA Sign off/Closed    | —            |
| CWR-I551   | CBA sub questions are not visible in split screen mode                                                                    | High     | QA Sign off/Closed    | —            |
| CWR-I613   | “Show Answer” Button Remains Enabled After Displaying Answer                                                              | High     | QA Sign off/Closed    | —            |
| CWR-I619   | Incomplete Content Display in Case Study                                                                                  | High     | QA Sign off/Closed    | —            |
| CWR-I620   | Answer Visibility Not Reset When Navigating Between Questions                                                             | High     | QA Sign off/Closed    | —            |
| CWR-I667   | Gap observed between angle tool and drawn line in widget                                                                  | High     | QA Sign off/Closed    | —            |
| TCN-I14960 | Concept Names Are Not Displayed in View details After Creating the Test                                                   | High     | QA Sign off/Closed    | —            |
| TCN-I14962 | Next Question Opens from Previous Scroll Position                                                                         | High     | QA Sign off/Closed    | —            |
| TCN-I14978 | Incorrect count mismatch – only 5 incorrect questions displayed instead of 7 on teacher launch card                       | High     | QA Sign off/Closed    | —            |
| TCN-I14981 | “Student already logged in” error shown after page refresh during roll number entry                                       | High     | QA Sign off/Closed    | —            |
| TCN-I14986 | Delay in Test Creation and Success Toast Not Displayed Immediately After Clicking “Save Student Test”                     | High     | QA Sign off/Closed    | —            |
| TCN-I14987 | Timeout Pop-up Not Displayed After Test Time Expiry                                                                       | High     | QA Sign off/Closed    | —            |
| TCN-I14988 | Duplicate Class Label Displayed in View Report Header                                                                     | High     | QA Sign off/Closed    | —            |
| TCN-I14991 | Student Name Displayed in Marks Field When Value is Null in Imported Excel                                                | High     | QA Sign off/Closed    | —            |
| TCN-I15362 | Resource video takes too long to load                                                                                     | High     | Closed                | —            |
| TCN-I15376 | Diagram-type Interactivity Assets are loading but not functional (Play, Annotate, Interact not working)                   | High     | Closed                | —            |
| TCN-I15379 | Incorrect navigation behavior for Case Study subquestions – Requires double click to open and highlight selected question | High     | QA Sign off/Closed    | —            |
| TCN-I15390 | Broken Images Displayed – Image-Based Questions Not Loading Properly                                                      | High     | Closed                | —            |
| TCN-I15393 | Extra Blank Space Displayed on Right Side in Sample Paper Preview                                                         | High     | QA Sign off/Closed    | —            |
| TCN-I15731 | Report Details Screen Gets Hidden Behind Real Usage Data Screen                                                           | High     | Closed                | —            |
| CWR-I287   | UI misalignment occurs after Excel-to-PDF resource fails to load                                                          | Medium   | QA Sign off/Closed    | —            |
| CWR-I668   | Incorrect/partially visible scale numbers in angle tool (extra numbers visible on edges)                                  | Medium   | QA Sign off/Closed    | —            |
| CWR-I669   | Line continues beyond ruler length while drawing using ruler tool                                                         | Medium   | QA Sign off/Closed    | —            |
| CWR-I694   | Resource Opens in Smaller Size Than Expected                                                                              | Medium   | Duplicate             | —            |
| CWR-I709   | Simulation resource does not open when selected                                                                           | Medium   | Duplicate             | —            |
| TCN-I15347 | Resource not added to tray bar after opening in Class 10A Science 10.2                                                    | Medium   | Closed                | —            |
| TCN-I15350 | Resource Opens in Smaller Size Than Expected                                                                              | Medium   | Closed                | —            |
| TCN-I15352 | Resource "10.2" opens in a small window under "10a science"                                                               | Medium   | Closed                | —            |
| TCN-I15353 | Resource opens in a small window instead of expected size                                                                 | Medium   | Closed                | —            |
| TCN-I16084 | UI Border Rendering Issue on the Top-Left and Bottom Edges of the Sign-Up Popup                                           | Low      | QA Sign off/Closed    | —            |

### Whiteboard (49)

| Zoho ID    | Title                                                                                                   | Priority | Status                | Matched test                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------------------------------------------------------ |
| TCN-I15836 | Eraser Tool Occasionally Does Not Work During Annotation                                                | Highest  | **Ready for Testing** | —                                                            |
| TCN-I15837 | Annotation Strokes Break Intermittently While Drawing                                                   | Highest  | **Ready for Testing** | —                                                            |
| TCN-I16253 | Whiteboard Automatically Pans When Opening an Asset from Playlist                                       | Highest  | **To do**             | —                                                            |
| TCN-I16308 | Last Accessed Topic Not Opening After Login                                                             | Highest  | **Reopened**          | `TCN-I16308 (tests/zoho-regression/historical-bugs.spec.js)` |
| TCN-I16689 | V1 – Clear Whiteboard action fails with 404 error                                                       | Highest  | **Ready for Testing** | —                                                            |
| TCN-I16705 | Whiteboard – Curved Annotation Strokes Are Rendered as Straight Lines                                   | Highest  | **To do**             | —                                                            |
| TCN-I16706 | Whiteboard – Handwritten Annotation Strokes Are Missing                                                 | Highest  | **To do**             | —                                                            |
| CWR-I299   | V2 - Other widgets become unclickable after closing a widget in CEP.                                    | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15234 | [ Shared ] Asset Opens at Top of Whiteboard Instead of Current Working Position                         | Highest  | Duplicate             | —                                                            |
| TCN-I15241 | Asset Opens at Top of Whiteboard Instead of Current Working Position                                    | Highest  | Invalid               | —                                                            |
| TCN-I15317 | Content Position Resets After Opening Asset from Playlist                                               | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15364 | Floating Annotation Pencil and Eraser Not Working in Worksheet                                          | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15458 | Previously Added Whiteboard Content Is Missing on Reopening the Topic                                   | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15463 | Browser Crashes After Adding Large Data in a Topic                                                      | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15631 | Undo Button Remains Active After Sign Out and Restores Previous Whiteboard Annotations                  | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I15771 | Whiteboard Data Not Saving After Long Usage in Server Setup Without Internet                            | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16017 | Four Line with Space background remains black in Light Mode, hiding Logo, Date/Time, Subject, and Topic | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16037 | Whiteboard data is not saved after adding new content to an existing whiteboard                         | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16038 | Whiteboard annotations are not smooth while drawing curves                                              | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16133 | Eraser Gets Stuck After Panning PDF                                                                     | Highest  | Invalid               | —                                                            |
| TCN-I16315 | Text Content Is Not Preserved Correctly in Exported Whiteboard PDF                                      | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16392 | Whiteboard Thumbnail Is Not Updated When Saved with Text Box Content                                    | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16483 | Pen Tool Does Not Draw a Dot on Single Click                                                            | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16581 | Whiteboard Window Remains Open After Automatic Sign-Out                                                 | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16612 | Whiteboard Data Is Not Retrieved After Topic Change or Relogin                                          | Highest  | Invalid               | —                                                            |
| TCN-I16613 | Eraser Is Not Working                                                                                   | Highest  | Invalid               | —                                                            |
| TCN-I16614 | Last Written Position Is Not Retained After Topic Switch or Relogin                                     | Highest  | Invalid               | —                                                            |
| TCN-I16616 | Session Times Out Within a Few Minutes                                                                  | Highest  | Invalid               | —                                                            |
| TCN-I16617 | Pen Size Appears Different in Whiteboard and Video Player                                               | Highest  | Invalid               | —                                                            |
| TCN-I16618 | Virtual Keyboard Does Not Open on New Password Creation                                                 | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16619 | Whiteboard Content Is Not Displayed in Satellite Preview                                                | Highest  | Invalid               | —                                                            |
| TCN-I16637 | Blank Whiteboard Downloaded as a 4-Page PDF                                                             | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16640 | Typed Text Is Not Preserved When Whiteboard Content Is Saved to Playlist                                | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16700 | Whiteboard History screen remains open after signing out                                                | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I16712 | WebDrop – Add to Whiteboard Button Missing for Video                                                    | Highest  | Invalid               | —                                                            |
| TCN-I16852 | Cleared Whiteboard Data Restored After Topic Navigation                                                 | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I17062 | 110133-Whiteboard eraser and pencil not working                                                         | Highest  | QA Sign off/Closed    | —                                                            |
| TCN-I17063 | 109276-Whiteboard annotation changes automatically                                                      | Highest  | QA Sign off/Closed    | —                                                            |
| CWR-I274   | Browser assets fail to load – "Not Found" error on accessing whiteboard URLs                            | High     | Invalid               | —                                                            |
| CWR-I288   | Unable to add gallery images to whiteboard                                                              | High     | QA Sign off/Closed    | —                                                            |
| CWR-I755   | Erased Shapes/Annotations Reappear After Navigating Between Topics on Whiteboard                        | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15216 | LaTeX Formatting Syntax Displayed Instead of Mathematical Symbols in Question Content                   | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15235 | [ Shared ] Last Used Whiteboard Screen Is Not Properly Aligned After Re-Login                           | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15240 | Last Used Whiteboard Screen Is Not Properly Aligned After Re-Login                                      | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15368 | CBA Topic Name Displayed Twice                                                                          | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15392 | Text Editing Popup Not Appearing After Selecting Text Box on Large Whiteboard Content                   | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15917 | Whiteboard: Annotation shape changes after using Eraser                                                 | High     | QA Sign off/Closed    | —                                                            |
| TCN-I15346 | Video resource does not open in Class 10A Science 10.2                                                  | Medium   | Closed                | —                                                            |
| TCN-I16039 | Line shape is removed instead of moving when using the Select tool                                      | Medium   | QA Sign off/Closed    | —                                                            |

### Magnet (entry point -> Attendance/Homework/Notices/Learning Shorts) (26)

| Zoho ID    | Title                                                                                                          | Priority | Status             | Matched test |
| ---------- | -------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I301   | V2 - Learning Shot feature not working and Record button not clickable in CEP.                                 | Highest  | QA Sign off/Closed | —            |
| CWR-I310   | Homework is not displaying properly in Magnet in Android V2 build                                              | Highest  | QA Sign off/Closed | —            |
| CWR-I358   | V2-CEP Magnet Sent Notices, Homework, and Learning Short Messages Are Not Displayed                            | Highest  | QA Sign off/Closed | —            |
| CWR-I439   | Sales-Error While Generating AI Questions During Homework Creation from Magnet                                 | Highest  | QA Sign off/Closed | —            |
| CWR-I514   | AI-Generated Linear Equation Questions Not Displayed Properly in Homework                                      | Highest  | Duplicate          | —            |
| CWR-I526   | Conflicting Success and Failure Messages Displayed When Creating Homework from Magnet After Logout             | Highest  | QA Sign off/Closed | —            |
| CWR-I536   | Analyseit report not generated for Homework in CEP – last 5 assignments progress not displayed                 | Highest  | QA Sign off/Closed | —            |
| CWR-I553   | Chemical equations not rendering properly in AI-generated homework questions (Magnet)                          | Highest  | QA Sign off/Closed | —            |
| CWR-I628   | Validation Error on Generating Questions After Selecting Count Above Limit in Homework/Revise                  | Highest  | QA Sign off/Closed | —            |
| CWR-I629   | AI Questions Are Not Generated While Creating Homework                                                         | Highest  | QA Sign off/Closed | —            |
| CWR-I678   | Learning Shorts Not Working (No Action on Click)                                                               | Highest  | Invalid            | —            |
| CWR-I753   | Learning Shot Not Showing Preview After Stop in IFP Client (V2)                                                | Highest  | QA Sign off/Closed | —            |
| TCN-I15700 | Sales-Unable to Create Notice – "Unable to process, please try again!" Error Message Displayed                 | Highest  | QA Sign off/Closed | —            |
| TCN-I15823 | Unable to Create Notice and Homework – Error Messages Displayed During Creation                                | Highest  | Closed             | —            |
| TCN-I16023 | Magnet Feature Not Working on Sales and QA Environments                                                        | Highest  | QA Sign off/Closed | —            |
| TCN-I16080 | Capture Box Appears Again While Moving Notice                                                                  | Highest  | QA Sign off/Closed | —            |
| TCN-I16615 | Send Notice Is Not Working                                                                                     | Highest  | Invalid            | —            |
| TCN-I16863 | Green Tick Missing for Selected Topic in Select Chapter Section While Creating Assignment/Homework from Magnet | Highest  | QA Sign off/Closed | —            |
| TCN-I16869 | Homework/Magnet Screen Overlaps the Resource Tray                                                              | Highest  | QA Sign off/Closed | —            |
| TCN-I16879 | Notice Creation Drag Box Is Not Displayed While Creating Notice from Magnet                                    | Highest  | QA Sign off/Closed | —            |
| TCN-I16995 | Duplicate chapter number displayed in Homework chapter selection list                                          | Highest  | QA Sign off/Closed | —            |
| TCN-I17105 | Image Type Question Not Loading in Magnet Homework                                                             | Highest  | QA Sign off/Closed | —            |
| CWR-I467   | Serial Numbers occurs twice for AI generated Questions in Homework                                             | High     | QA Sign off/Closed | —            |
| CWR-I523   | Incorrect Chapter Count Displayed Due to Concepts and Topics Listed Under Chapter Selection                    | High     | QA Sign off/Closed | —            |
| CWR-I633   | Content Misalignment in CEP Assignment Question.                                                               | High     | QA Sign off/Closed | —            |
| TCN-I15460 | Magnet Homework - Blank Question Appears After Removing Generated Question                                     | High     | Invalid            | —            |

### Ops / Infra (non-UI) (26)

| Zoho ID    | Title                                                                                           | Priority | Status             | Matched test |
| ---------- | ----------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I16740 | SFDC-Content 00120071-Playlist is Empty for Multiple Grades/Subjects/Topics                     | Highest  | **On Hold**        | —            |
| TCN-I16741 | 0012007-Teachers Accounts are Automatically Logged Out                                          | Highest  | **To do**          | —            |
| TCN-I16742 | SFDC-Content 00120071-Relevant Textbook Content Not Available for Selected Chapters/Topics      | Highest  | **On Hold**        | —            |
| TCN-I15480 | Whiteboard Data Not Syncing Across Devices                                                      | Highest  | QA Sign off/Closed | —            |
| TCN-I15484 | Application crashes while navigating large PDF resources (more than 200 pages) in the classroom | Highest  | QA Sign off/Closed | —            |
| TCN-I15485 | Content Filter Applied errors are being observed on the OPS platform.                           | Highest  | QA Sign off/Closed | —            |
| TCN-I15486 | Recently Accessed Resources Not Reflecting Across Classrooms                                    | Highest  | QA Sign off/Closed | —            |
| TCN-I15547 | Unable to Write Annotations on Video During Playback                                            | Highest  | Invalid            | —            |
| TCN-I15588 | Resource Icons Not Loading Properly in Content Tray                                             | Highest  | Invalid            | —            |
| TCN-I15593 | Eraser Tool Not Functioning Properly in Some Classrooms                                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15594 | Annotation Not Working on Media Resources                                                       | Highest  | QA Sign off/Closed | —            |
| TCN-I15634 | 117282-Offline Error Symbols Not Displaying Properly                                            | Highest  | QA Sign off/Closed | —            |
| TCN-I15635 | 117282-E-Books Not Opening in Offline Mode                                                      | Highest  | QA Sign off/Closed | —            |
| TCN-I15636 | 117282-Login Page Loading Delay                                                                 | Highest  | QA Sign off/Closed | —            |
| TCN-I15637 | 117274-Scroll Position Syncing Across Topics and Chapters                                       | Highest  | Duplicate          | —            |
| TCN-I15638 | Lack of Resources                                                                               | Highest  | Duplicate          | —            |
| TCN-I15639 | 117286-Class 5 EVS Content Not Visible                                                          | Highest  | QA Sign off/Closed | —            |
| TCN-I15947 | Whiteboard auto-save gets stuck at "1 sec" after editing the whiteboard                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15948 | Cleared annotations reappear after switching topics or re-login                                 | Highest  | QA Sign off/Closed | —            |
| TCN-I16733 | 00120420-Limited Writing Space on Board                                                         | Highest  | Invalid            | —            |
| TCN-I16735 | 00120420-Unable to Scroll Within the Same Board Page                                            | Highest  | Invalid            | —            |
| TCN-I15476 | Whiteboard Saving Not Consistent                                                                | High     | QA Sign off/Closed | —            |
| TCN-I15477 | Last Accessed Topic Not Opening After Login                                                     | High     | QA Sign off/Closed | —            |
| TCN-I15478 | Content Playlist Requires Manual Reset                                                          | High     | QA Sign off/Closed | —            |
| TCN-I15479 | Frequent Session Timeout Pop-up                                                                 | High     | QA Sign off/Closed | —            |
| TCN-I15489 | Diagram Tool Not Working for Higher Grades                                                      | Medium   | QA Sign off/Closed | —            |

### Players (Quiz) (22)

| Zoho ID    | Title                                                                                                                             | Priority | Status             | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I16183 | V1-Broken Image Is Displayed Instead of Question Text for Image-Based Questions in TCE Question Preview                           | Highest  | **To do**          | —            |
| CWR-I284   | Quiz Options Need to Be Displayed Inline                                                                                          | Medium   | **To do**          | —            |
| CWR-I532   | CBA questions are not displayed in Quiz showing type as Unknown                                                                   | Highest  | QA Sign off/Closed | —            |
| CWR-I621   | Questions Table Missing in CEP Play Quiz & Incomplete Questions Displayed                                                         | Highest  | QA Sign off/Closed | —            |
| TCN-I15260 | Custom Quiz Does Not Open and Displays Continuous Loading Spinner                                                                 | Highest  | Closed             | —            |
| TCN-I15262 | Custom Quiz Does Not Open and Displays "No Valid Question Found" Error                                                            | Highest  | QA Sign off/Closed | —            |
| TCN-I15318 | Questions not found on Swap while creating homework from Magnet                                                                   | Highest  | Closed             | —            |
| TCN-I15386 | Class Strength Message Not Visible in Air Card Quiz Screen                                                                        | Highest  | QA Sign off/Closed | —            |
| TCN-I15679 | Play Quiz Remains Open When Next Topic Has No Content                                                                             | Highest  | QA Sign off/Closed | —            |
| TCN-I15681 | Other Quiz Files Cannot Be Opened After Encountering the Error                                                                    | Highest  | QA Sign off/Closed | —            |
| TCN-I15782 | Custom Quiz for Open-Ended Questions Is Not Displayed in Playlist                                                                 | Highest  | QA Sign off/Closed | —            |
| TCN-I15831 | Blank Screen Displayed on Both Panes When Splitting a Single Question in Quiz Player                                              | Highest  | QA Sign off/Closed | —            |
| CWR-I361   | V2-Submit Answer Button Enabled Without Selection in Play Quiz Resource                                                           | High     | QA Sign off/Closed | —            |
| CWR-I368   | CBA TP contains only worksheet; “Play Quiz” file missing — unable to access CBA questions                                         | High     | QA Sign off/Closed | —            |
| CWR-I758   | Broken image shown on Question Card, but Preview Image displays correctly                                                         | High     | QA Sign off/Closed | —            |
| TCN-I14957 | Broken Images Displayed in Question Preview While Creating Baseline Test                                                          | High     | QA Sign off/Closed | —            |
| TCN-I15264 | In V1, Question Content Does Not Update on Navigation; Same Question Remains Displayed While Split Question Shows Correct Content | High     | Closed             | —            |
| TCN-I15678 | Unknown Question Type Displayed in Quiz Player                                                                                    | High     | QA Sign off/Closed | —            |
| TCN-I15680 | "No Valid Question Found" Error Displayed in Exercise Quiz                                                                        | High     | QA Sign off/Closed | —            |
| CWR-I706   | Resources Not Displayed for Chapters 10.2, 10.3, and 10.4 in Class 7 Science                                                      | Medium   | QA Sign off/Closed | —            |
| TCN-I15325 | CBA Quiz – Incorrect Solution Displayed for Sub-question                                                                          | Medium   | Invalid            | —            |
| TCN-I15387 | Question Headings Not Visible in Air Card Quiz Summary Screen                                                                     | Medium   | QA Sign off/Closed | —            |

### Toolbar (16)

| Zoho ID  | Title                                                                                          | Priority | Status             | Matched test |
| -------- | ---------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I300 | V2 - Unable to resize or modify shape after drawing in CEP.                                    | Highest  | QA Sign off/Closed | —            |
| CWR-I303 | V2 - Drawing path window elements do not respond after drawing a shape in CEP.                 | Highest  | QA Sign off/Closed | —            |
| CWR-I307 | Symbols Not Displayed in “More Symbols” Section in CEP V2                                      | Highest  | QA Sign off/Closed | —            |
| CWR-I308 | V2 - Chapter/Topic name and toolbar remain visible when widget is opened in fullscreen in CEP. | Highest  | QA Sign off/Closed | —            |
| CWR-I311 | V1 -Four Line Extra Space 02 Background Displays Partially and Causes Lag in Android 76 Build. | Highest  | QA Sign off/Closed | —            |
| CWR-I770 | Virtual Keyboard Does Not Appear Initially Even When Toggle Is Enabled                         | Highest  | QA Sign off/Closed | —            |
| CWR-I663 | “More” Symbol Window Hidden Behind Playlist When Resource Tray is Open                         | High     | QA Sign off/Closed | —            |
| CWR-I664 | Shape Size Not Updating Correctly When Changed from Context Menu                               | High     | QA Sign off/Closed | —            |
| CWR-I740 | “Clear Annotation” button clears entire whiteboard instead of only annotations                 | High     | QA Sign off/Closed | —            |
| CWR-I754 | Mini Widget Screen Displayed on Toolbar When User Opens Widget                                 | High     | Invalid            | —            |
| CWR-I666 | Zoom Slider Thumb Appears Partially Cut on Hover                                               | Medium   | QA Sign off/Closed | —            |
| CWR-I670 | Widget overlaps with widget selection panel                                                    | Medium   | QA Sign off/Closed | —            |
| CWR-I671 | Unable to resize shapes added from toolbar                                                     | Medium   | QA Sign off/Closed | —            |
| CWR-I672 | Default “Type here” text reappears while typing in text box                                    | Medium   | QA Sign off/Closed | —            |
| CWR-I673 | Unable to resize text box after adding text                                                    | Medium   | QA Sign off/Closed | —            |
| CWR-I765 | Disable Virtual Keyboard toggle/CTA is not working properly                                    | Lowest   | QA Sign off/Closed | —            |

### Compass (AfL Reports) (14)

| Zoho ID    | Title                                                                                                     | Priority | Status                | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------ |
| TCN-I16911 | Academic Year Field Is Blank and Test Type Is Displayed Instead of Test/Assessment Tile for Baseline Test | Highest  | **Ready for Testing** | —            |
| TCN-I16927 | Incorrect “Need Attention” Percentage Displayed for 100% Mastery on Student Report Card                   | Highest  | **Ready for Testing** | —            |
| TCN-I17129 | Student Report Card Print Preview renders a black/blank page instead of the report content                | Highest  | **To do**             | —            |
| TCN-I16599 | Only One Division Displayed for Any Grade in AfL Report for Principal Account                             | Highest  | QA Sign off/Closed    | —            |
| TCN-I16602 | AfL Report Not Displayed When “All Sections” Filter Is Selected                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I16604 | Data Count Displayed as “0%” in AfL Report                                                                | Highest  | QA Sign off/Closed    | —            |
| TCN-I16605 | Report Module Name Overlaps with Report Type Tabs in AfL Report Print Preview                             | Highest  | QA Sign off/Closed    | —            |
| TCN-I16606 | Overall Reports & Analytics Page Printed Instead of AfL Report                                            | Highest  | QA Sign off/Closed    | —            |
| TCN-I16608 | Duplicate Tests with Same Name Are Not Displayed Separately in Assessment Dropdown                        | Highest  | QA Sign off/Closed    | —            |
| TCN-I16904 | Student Name Overlaps with Student Progress Badge in AfL Repor                                            | Highest  | QA Sign off/Closed    | —            |
| TCN-I16905 | Concept Name Is Not Displayed on Student Card as per Student Progress in AfL Report                       | Highest  | QA Sign off/Closed    | —            |
| TCN-I16907 | Dropdown Box Is Displayed Partially Cut Off                                                               | Highest  | QA Sign off/Closed    | —            |
| TCN-I16909 | School Name Is Not Displayed on Student Report Card in AfL Report                                         | Highest  | QA Sign off/Closed    | —            |
| TCN-I16912 | Roll Number Is Not Displayed Below the Student Name on Student Report Card                                | Highest  | QA Sign off/Closed    | —            |

### Grade / Subject / Division (13)

| Zoho ID    | Title                                                                                               | Priority | Status             | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I15324 | Incorrect Resources Displayed in 7A Computer Science 1.1 – Math Content Shown                       | High     | **To do**          | —            |
| CWR-I407   | V2-Screen stays idle for new user after selecting Grade, Division, and Subject.                     | Highest  | QA Sign off/Closed | —            |
| CWR-I418   | V2-Grade/Subject Selection Screen Not Displayed for New CEP User – Only Loading Screen Appears      | Highest  | QA Sign off/Closed | —            |
| TCN-I14961 | PDF Is Not Generated for Paper Test Mode for Math Subject                                           | Highest  | QA Sign off/Closed | —            |
| TCN-I16990 | HTML entity &#39; displayed instead of apostrophe in Whiteboard chapter name                        | Highest  | QA Sign off/Closed | —            |
| CWR-I277   | Primary & Secondary grade options are not visible in the application                                | High     | QA Sign off/Closed | —            |
| CWR-I360   | V2-Subject list is not displayed in alphabetical order                                              | High     | QA Sign off/Closed | —            |
| CWR-I365   | V2-Subject Grade Selection Window Closes When Switching Divisions                                   | High     | Duplicate          | —            |
| TCN-I14959 | Incorrect Subject icon and title subtext displayed for Student After Launching Test                 | High     | QA Sign off/Closed | —            |
| TCN-I15334 | Images Not Rendering for Linear Equations Questions (CEP)                                           | High     | QA Sign off/Closed | —            |
| TCN-I15367 | Broken Image Displayed for Diagram resource                                                         | High     | QA Sign off/Closed | —            |
| TCN-I15337 | Content Does Not Load on First Attempt and Becomes Visible Only After Re-click                      | Medium   | Closed             | —            |
| TCN-I15354 | Resource does not open when selected from vertical panel in Class 10A Science section (Lesson 10.1) | Medium   | Closed             | —            |

### Compass (12)

| Zoho ID    | Title                                                                                                                             | Priority | Status                | Matched test |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ------------ |
| TCN-I16623 | “View Questions” and “View Last 5 Homework” Buttons Are Non-Functional in Analyse It Report                                       | Highest  | **Ready for Testing** | —            |
| TCN-I16955 | V1-LaTeX Formatting Is Displayed as Plain Text in Question Options                                                                | Highest  | **To do**             | —            |
| TCN-I16046 | Revision Test Pop-Up Does Not Close on Topic Navigation                                                                           | Highest  | QA Sign off/Closed    | —            |
| TCN-I16052 | Student Test Pop-up Overlaps Resource Tray, Obstructing Resource Access and Long Concept Names                                    | Highest  | QA Sign off/Closed    | —            |
| TCN-I16056 | Compass Panel Opens Behind the Revision Test Pop-up on Repeated Click                                                             | Highest  | QA Sign off/Closed    | —            |
| TCN-I16853 | Unsaved Annotation Data Reappears After Clearing Whiteboard                                                                       | Highest  | QA Sign off/Closed    | —            |
| CWR-I735   | Open Widget CTA appears clickable but does not perform any action in ExploreIt                                                    | High     | QA Sign off/Closed    | —            |
| CWR-I769   | "Compass" Text Appears on Hover for All Widgets Instead of Respective Widget Names                                                | High     | QA Sign off/Closed    | —            |
| TCN-I14985 | Inconsistent CTA Naming During Revision Test Creation Flow                                                                        | High     | QA Sign off/Closed    | —            |
| TCN-I15388 | Options Not Displayed for Image-Based Question in Grade 8 Chapter 1 in View Details and Student Test After Creating Revision Test | High     | QA Sign off/Closed    | —            |
| TCN-I16048 | Revision Test Card Layout Breaks Due to Overlapping Title and Metadata                                                            | High     | QA Sign off/Closed    | —            |
| CWR-I654   | Context menu gets hidden when toolbar is moved                                                                                    | Medium   | QA Sign off/Closed    | —            |

### Players (Code Editor) (12)

| Zoho ID    | Title                                                                                                                                          | Priority | Status             | Matched test |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I14932 | Error displayed while saving code from AI Assist                                                                                               | Highest  | QA Sign off/Closed | —            |
| TCN-I14936 | Teacher Handout PDF Not Able to Open                                                                                                           | Highest  | QA Sign off/Closed | —            |
| TCN-I14948 | Code Editor Not Working (Displays Blank) V1 & V2                                                                                               | Highest  | QA Sign off/Closed | —            |
| TCN-I16694 | Run button executes empty code and displays internal errors in code editor                                                                     | Highest  | QA Sign off/Closed | —            |
| TCN-I14935 | Handout Not Found / Not Opening & Code Files Missing Across Multiple Grades                                                                    | High     | QA Sign off/Closed | —            |
| TCN-I14938 | The code editor is missing in multiple chapters in Class 11 and Class 12. When opening these chapters, the code editor section is not visible. | High     | QA Sign off/Closed | —            |
| TCN-I14939 | Side Section Text Overlaps First Section When Collapsing Coding Asset/Resource                                                                 | High     | QA Sign off/Closed | —            |
| TCN-I14940 | Spelling error in blockly sprite editor – “Baloons” displayed instead of “Balloons”                                                            | High     | QA Sign off/Closed | —            |
| TCN-I14943 | Code file not saved in Playlist in Teach Mode despite clicking Save to Playlist button                                                         | High     | QA Sign off/Closed | —            |
| TCN-I14945 | Success popup does not close on re-running Maze code; output runs in background                                                                | High     | QA Sign off/Closed | —            |
| TCN-I14937 | “Add to Playlist” Option Missing in Code Editor                                                                                                | Medium   | QA Sign off/Closed | —            |
| TCN-I16654 | “Create New” text is partially hidden on AI Assist screen after clicking “Generate Code”                                                       | Medium   | Invalid            | —            |

### Players (Worksheet) (5)

| Zoho ID    | Title                                                                                        | Priority | Status             | Matched test |
| ---------- | -------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I16307 | V1-CBA Sub-Question Navigation Panel Is Not Displayed in" Exercise" for Case Study Questions | Highest  | QA Sign off/Closed | —            |
| TCN-I16675 | V1-First letter of the first word is missing in Case Study question                          | Highest  | QA Sign off/Closed | —            |
| TCN-I16676 | V1-Case Study label overlaps and hides question text                                         | Highest  | Closed             | —            |
| TCN-I16557 | V1-Subquestion text not displayed / subquestion inaccessible when clicked in CBA             | High     | QA Sign off/Closed | —            |
| TCN-I16560 | V1-CBA-Question stem font size is significantly larger in Assertion-Reasoning question type  | High     | QA Sign off/Closed | —            |

### AI Assist (3)

| Zoho ID  | Title                                                                            | Priority | Status             | Matched test |
| -------- | -------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I445 | AI Assist Not Working in CEP – "No Data Available" Message Displayed             | Highest  | QA Sign off/Closed | —            |
| CWR-I674 | AI Assist Exercise Saved Without Confirmation and Shows No Valid Questions       | Highest  | QA Sign off/Closed | —            |
| CWR-I262 | Opening Browser, AI Assist, or YouTube Assets Navigates to "File Not Found" Page | High     | QA Sign off/Closed | —            |

### AI Homework (3)

| Zoho ID    | Title                                                                                    | Priority | Status             | Matched test |
| ---------- | ---------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I15361 | Multiple Submodules Can Be Opened Simultaneously in Magnet                               | High     | **To do**          | —            |
| CWR-I302   | Homework feature not working in CEP v2                                                   | Highest  | QA Sign off/Closed | —            |
| CWR-I339   | V2 - No success message popup after creating and sending Homework and Revise assignments | Highest  | Duplicate          | —            |

### AI Notices (3)

| Zoho ID  | Title                                                                                                                 | Priority | Status             | Matched test |
| -------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I381 | Captured content not displayed while creating Notices – AI (Magnet) shows error “No readable text found in the image” | Highest  | QA Sign off/Closed | —            |
| CWR-I357 | V2-Capture AI Notice content is displayed below the visible screen on scroll down                                     | High     | QA Sign off/Closed | —            |
| CWR-I741 | CEP V2 time mismatch with system time                                                                                 | High     | QA Sign off/Closed | —            |

### Drop It (3)

| Zoho ID    | Title                                                                                                         | Priority | Status             | Matched test |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| TCN-I16067 | DropIt - Sharing a link fails and displays "Failed" status on CEP                                             | Highest  | **To do**          | —            |
| TCN-I17127 | DropIt Does Not Display Success Status After URL Asset Is Successfully Added for All(CEP V1 ,V2 and Android ) | Lowest   | **To do**          | —            |
| TCN-I16097 | iOS: File Sharing Fails on First Attempt in Drop It                                                           | Highest  | QA Sign off/Closed | —            |

### Add Resource (2)

| Zoho ID  | Title                                                                  | Priority | Status             | Matched test |
| -------- | ---------------------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I305 | V2 - Add Resource Window Overlaps Toolbar and Blocks Filter Selection. | Highest  | QA Sign off/Closed | —            |
| CWR-I309 | User unable to connect Dropit with office network in CEP               | Highest  | QA Sign off/Closed | —            |

### Core UI (2)

| Zoho ID  | Title                                                     | Priority | Status             | Matched test |
| -------- | --------------------------------------------------------- | -------- | ------------------ | ------------ |
| CWR-I665 | Context Menu Remains Visible After Logout on Sign-In Page | High     | QA Sign off/Closed | —            |
| CWR-I675 | Ebook Remains Visible After Closing and Logout            | High     | QA Sign off/Closed | —            |

### TCE Search Library (2)

| Zoho ID   | Title                                                                        | Priority | Status    | Matched test |
| --------- | ---------------------------------------------------------------------------- | -------- | --------- | ------------ |
| TCN-I7120 | CEP- Bubbles don't always come in the right place It has to be on the stand. | High     | **To do** | —            |
| TCN-I6380 | Lesson Planning - Exercise Resource Answers are showing Blank                | Highest  | Invalid   | —            |

### Players (Ebook) (1)

| Zoho ID    | Title                                                             | Priority | Status    | Matched test |
| ---------- | ----------------------------------------------------------------- | -------- | --------- | ------------ |
| TCN-I17065 | 109888-Worksheet Alignment Errors Observed During Classroom Visit | Highest  | **To do** | —            |

### User Profile (1)

| Zoho ID  | Title                                                              | Priority | Status             | Matched test |
| -------- | ------------------------------------------------------------------ | -------- | ------------------ | ------------ |
| CWR-I742 | User profile popup does not close properly and blocks UI in CEP V2 | High     | QA Sign off/Closed | —            |

---

## Excluded — Plan Mode bugs (73, out of this suite's current scope)

### Players (Checkpoint) (23)

| Zoho ID    | Title                                                                                                                 | Priority | Status             |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16636 | Question Card Image Is Blank While Question Preview Displays the Content                                              | Highest  | **Reopened**       |
| TCN-I14958 | Broken Image Displayed for “Square Numbers and Properties of Perfect Square” Concept for Revision Test(Question Bank) | Highest  | QA Sign off/Closed |
| TCN-I14965 | Test created in Plan Mode is not visible in Teach Mode for same Grade/Division/Baseline                               | Highest  | QA Sign off/Closed |
| TCN-I14997 | Report Not Displayed After Submitting Marks in Teach Mode and Plan Mode for Paper Test                                | Highest  | QA Sign off/Closed |
| TCN-I14999 | Plan Mode-Questions Missing for Some Concepts Showing 0 Count                                                         | Highest  | QA Sign off/Closed |
| TCN-I15006 | Download PDF and Print Paper Buttons Not Working in View details                                                      | Highest  | QA Sign off/Closed |
| TCN-I15007 | Error Occurs on Clicking “View Details” in Assessment Module                                                          | Highest  | QA Sign off/Closed |
| TCN-I15033 | Baseline Test Creation Fails with 500 Internal Server Error                                                           | Highest  | QA Sign off/Closed |
| TCN-I16045 | Revision Test card text overlaps in Teach Mode Compass                                                                | Highest  | QA Sign off/Closed |
| TCN-I16574 | Baseline Test Can Be Created for Unassigned Subjects but Is Not Available in Teach Mode                               | Highest  | QA Sign off/Closed |
| TCN-I16582 | Teacher-Created Test Is Visible in Teach Mode but Missing in Plan Mode                                                | Highest  | QA Sign off/Closed |
| TCN-I16597 | Teacher Able to Create Baseline Test for Non-Assigned Subject within a division and access it in teach mode           | Highest  | QA Sign off/Closed |
| TCN-I16598 | Baseline Test Topic Missing for Assigned Subject in Teach Mode;it restrict to access the created test                 | Highest  | Closed             |
| TCN-I16620 | Plan Mode-Mathematical Equations Are Incorrectly Rendered in Assessment Details for grade 10 Mathematics              | Highest  | QA Sign off/Closed |
| TCN-I16746 | Student report is not generated for Grade 6 C Baseline Test                                                           | Highest  | QA Sign off/Closed |
| TCN-I16784 | Plan Mode-Forms of Water Concept Questions are Displayed as Raw Data and Appear Blank in the Created Test             | Highest  | QA Sign off/Closed |
| TCN-I14956 | Checkpoint Editor Fails to Load on Clicking Checkpoint in Planning                                                    | High     | QA Sign off/Closed |
| TCN-I14966 | “Create Test” button disabled for assigned subject on first login                                                     | High     | QA Sign off/Closed |
| TCN-I14967 | “Create Test” button enabled and functional for unassigned subject in Checkpoint                                      | High     | QA Sign off/Closed |
| TCN-I15001 | Plan Mode-“Baseline Test” Topic Displayed in Concepts List During Baseline Test Creation                              | High     | QA Sign off/Closed |
| TCN-I15005 | TP ID Displayed Below Each Question in question preview under View Details                                            | High     | QA Sign off/Closed |
| TCN-I15008 | Newly Created Test Not Displayed at Top of List in Plan Mode                                                          | High     | QA Sign off/Closed |
| TCN-I15009 | Status Mismatch in Plan Mode – Test Card Shows “In Progress” While Filter Shows “Paused”                              | High     | QA Sign off/Closed |

### Authentication / Sign-In (9)

| Zoho ID    | Title                                                                                                     | Priority | Status             |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16399 | V1-Unable to Sign Out from Teach Mode on First Attempt; Logout Succeeds Only After Switching to Plan Mode | High     | **To do**          |
| CWR-I425   | V2-Grade selection keeps loading when user redirects from Plan to Teach mode                              | Highest  | QA Sign off/Closed |
| TCN-I15391 | Unable to Delete Custom Chapter and Topic Created in Plan Mode                                            | Highest  | Invalid            |
| TCN-I16204 | Unexpected Sign-Out Occurs While Switching from Teach Mode to Plan Mode                                   | Highest  | QA Sign off/Closed |
| TCN-I16279 | HTML Entities Are Displayed in Topic Names                                                                | Highest  | QA Sign off/Closed |
| TCN-I16324 | Content Library Grade and Subject Change Automatically When Switching Between Teach and Plan Modes        | Highest  | Invalid            |
| CWR-I421   | V2-Sign Out Button Not Visible on First Login in CEP Plan Mode                                            | High     | QA Sign off/Closed |
| CWR-I682   | Report Icon Visibility Not Updating After Switching from Teach to Plan Mode                               | High     | QA Sign off/Closed |
| TCN-I14964 | Newly created test not visible after re-login in Teach Mode; requires playlist reset to reflect           | Medium   | QA Sign off/Closed |

### Players (Code Editor) (9)

| Zoho ID    | Title                                                                                                                                  | Priority | Status             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I14929 | Prebuilt Python Template Executes Without Displaying Output in CS Code Editor Plan Mode                                                | Medium   | **To do**          |
| TCN-I14930 | Prebuilt Java Try-Catch Template for Sum and Difference Fails to Execute and Shows “Failed to Fetch” Error in CS Code Editor Plan Mode | Lowest   | **To do**          |
| TCN-I14931 | Saved code file not visible under selected Class/Subject/Chapter/Topic in Plan Mode                                                    | Highest  | QA Sign off/Closed |
| TCN-I14946 | V2-Chapter and Topic change automatically when teacher saves language code from Plan Mode                                              | Highest  | QA Sign off/Closed |
| TCN-I14942 | Spelling mistake in Code Editor – “Generate” displayed as “Genrate” in Generate Code panel (Plan Mode)                                 | High     | QA Sign off/Closed |
| TCN-I14944 | Expand All and Collapse All checkbox not visible in Teach Mode but visible in Plan Mode                                                | High     | QA Sign off/Closed |
| TCN-I14947 | V2-Plan Mode-Dropdown menu hidden behind Code Editor in Plan Mode                                                                      | High     | QA Sign off/Closed |
| TCN-I14933 | Missing Proper License Restriction Message for AI Assist Code Generation in Plan Mode                                                  | Medium   | QA Sign off/Closed |
| TCN-I14934 | Generate Code shows validation error even after selecting Class, Subject, Chapter, and Topic in Plan Mode                              | Medium   | QA Sign off/Closed |

### Playlist (9)

| Zoho ID    | Title                                                                                                                  | Priority | Status             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16180 | V1-Blank Screen Is Displayed Instead of Question Text When Opening an Open-Ended Question/CBA MUQ in the Question Bank | Highest  | **To do**          |
| TCN-I16544 | V1-Square Root Questions Are Not Properly Rendered on Question Cards in Question Bank                                  | Highest  | **To do**          |
| CWR-I327   | Question Display Blank & Overlapping in Planning Mode (Web V2)                                                         | Highest  | QA Sign off/Closed |
| CWR-I330   | V2-Newly Created Custom Chapter/Topic/Resource Not Visible in Teaching Mode.                                           | Highest  | Duplicate          |
| TCN-I16159 | Broken Image Icon Is Displayed Alongside the Image in Image-Based Questions                                            | Highest  | QA Sign off/Closed |
| TCN-I16545 | V1-Mathematical Expression Not Properly Rendered in Question Card in Plan Mode                                         | Highest  | QA Sign off/Closed |
| TCN-I15261 | Selected Chapter Not Reflected in QB TOC in Plan Mode; Questions Displayed for Selected Chapter                        | High     | QA Sign off/Closed |
| TCN-I15323 | Context mismatch between Plan Mode and Teach Mode after adding code resource in CEP V2                                 | High     | QA Sign off/Closed |
| CWR-I727   | Custom Book Creation Shows Old Book Instead of Newly Added Chapter in Teach Mode                                       | Lowest   | Duplicate          |

### Planning Mode (excluded) (5)

| Zoho ID    | Title                                                                                | Priority | Status                |
| ---------- | ------------------------------------------------------------------------------------ | -------- | --------------------- |
| TCN-I17068 | Mathematical Symbols Are Not Properly Rendered in Question Bank                      | Highest  | **Ready for Testing** |
| TCN-I16575 | HTML Entity Code Displayed in Topic Name Instead of Apostrophe in Plan Mode          | High     | **Ready for Testing** |
| TCN-I16671 | V1-HTML entity &#58; is displayed instead of colon : in Topic name                   | High     | **Reopened**          |
| TCN-I16766 | V1-Submit Answer button is displayed in disabled mode for Case Study                 | Highest  | QA Sign off/Closed    |
| TCN-I16785 | Missing spaces and formatting between question mark and answer items in SCQ question | Highest  | QA Sign off/Closed    |

### Players (Quiz) (4)

| Zoho ID    | Title                                                                                                           | Priority | Status             |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16181 | V1-Submit Button Remains Enabled After Submitting an Answer in Question Preview (Question Bank – Plan Mode)     | Highest  | **To do**          |
| TCN-I16184 | V1-HTML Character Entities Are Displayed Instead of Special Characters on the Question Card                     | Highest  | **To do**          |
| CWR-I637   | Plan Mode-Grade and Chapter Info Labels Overlapping with Question Type and Difficulty Level for Image Questions | Highest  | QA Sign off/Closed |
| CWR-I661   | Plan Mode-Submit Answer Button Overlapping with Options in Quiz Screen                                          | Highest  | QA Sign off/Closed |

### Compass (3)

| Zoho ID    | Title                                                                                              | Priority | Status             |
| ---------- | -------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16237 | Compass Is Not Visible in Teach Mode                                                               | Highest  | QA Sign off/Closed |
| TCN-I16266 | Option Images Are Not Displayed in Student Test                                                    | Highest  | Invalid            |
| CWR-I638   | Plan mode-CBA Questions Are Not Displayed in Preview While Creating Revision Test in Question Bank | High     | QA Sign off/Closed |

### Core UI (3)

| Zoho ID   | Title                                                                        | Priority | Status             |
| --------- | ---------------------------------------------------------------------------- | -------- | ------------------ |
| CWR-I1555 | Custom Chapter Not Deleting in Plan Mode                                     | High     | Done               |
| CWR-I662  | Plan Mode-Submit Answer Button Remains Enabled After Submission              | High     | Invalid            |
| CWR-I679  | Teacher Name Not Displayed in Profile After Redirect from Plan to Teach Mode | High     | QA Sign off/Closed |

### Compass (AfL Reports) (2)

| Zoho ID    | Title                                                                | Priority | Status             |
| ---------- | -------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16609 | AfL Report Screen Persists After Switching User Without Page Refresh | Highest  | QA Sign off/Closed |
| TCN-I16792 | Assessment for Learning (AfL) Tab Missing in Reports in Plan Mode    | Highest  | Invalid            |

### Whiteboard (2)

| Zoho ID    | Title                                                                           | Priority | Status             |
| ---------- | ------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16327 | Selected Grade Changes Unexpectedly When Switching Between Teach and Plan Modes | Highest  | **To do**          |
| TCN-I16621 | Selected Grade Changes After Switching Between Teach and Plan Modes             | Highest  | QA Sign off/Closed |

### Grade / Subject / Division (1)

| Zoho ID  | Title                                                                                        | Priority | Status             |
| -------- | -------------------------------------------------------------------------------------------- | -------- | ------------------ |
| CWR-I736 | Broken images displayed for image-based questions in Mathematics (Question Bank – Plan Mode) | High     | QA Sign off/Closed |

### Ops / Infra (non-UI) (1)

| Zoho ID    | Title                                                                | Priority | Status             |
| ---------- | -------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16191 | 117251-Open-Ended Question Content Is Not Displayed in Question Bank | Highest  | QA Sign off/Closed |

### Players (Worksheet) (1)

| Zoho ID    | Title                                                                                         | Priority | Status             |
| ---------- | --------------------------------------------------------------------------------------------- | -------- | ------------------ |
| TCN-I16561 | V1-CBA Question Displays Blank Screen in Plan Mode and “No Question to Display” in Teach Mode | Highest  | QA Sign off/Closed |

### Unclassified / Needs Review (1)

| Zoho ID  | Title                                                           | Priority | Status             |
| -------- | --------------------------------------------------------------- | -------- | ------------------ |
| CWR-I442 | Reports Keep Loading and Not Displayed in Plan Mode – 403 Error | Highest  | QA Sign off/Closed |
