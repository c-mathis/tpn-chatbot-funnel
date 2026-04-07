#!/usr/bin/env python3
import os
import glob

# Phone CTA section to add
phone_section = '''
  <!-- Phone CTA Section -->
  <section class="service-cta" style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);">
    <div class="section-container">
      <h2 style="color: white;">Need Immediate Help?</h2>
      <p style="color: rgba(255,255,255,0.9);">Speak with a tax specialist now</p>
      <a href="tel:+18664667012" id="phoneNumber" class="cta-button" style="background: white; color: #7C3AED; font-size: 24px; font-weight: bold; text-decoration: none; display: inline-block; padding: 16px 32px; margin: 16px 0;">866-466-7012</a>
      <p class="cta-disclaimer" style="color: rgba(255,255,255,0.8);">Available Monday-Friday, 9am-6pm EST</p>
    </div>
  </section>
  <script>
    (function() {
      const phoneNumbers = [
        { display: '866-466-7012', tel: '+18664667012' },
        { display: '866-314-3628', tel: '+18663143628' }
      ];
      const selectedPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
      const phoneLink = document.getElementById('phoneNumber');
      if (phoneLink) {
        phoneLink.textContent = selectedPhone.display;
        phoneLink.href = 'tel:' + selectedPhone.tel;
      }
    })();
  </script>
'''

# Find all service HTML files
service_files = glob.glob('_site/services/*/index.html')

for filepath in service_files:
    # Skip if already has phone section
    with open(filepath, 'r') as f:
        content = f.read()

    if 'Need Immediate Help?' in content:
        print(f'Skipping {filepath} - already has phone section')
        continue

    # Add phone section before </main>
    updated_content = content.replace('</main>', phone_section + '\n</main>')

    with open(filepath, 'w') as f:
        f.write(updated_content)

    print(f'Updated {filepath}')

print('Done!')
