#!/usr/bin/env python3
import os
import glob
import re

# Phone CTA section to add
phone_section = '''
  <!-- Phone CTA Section -->
  <section class="service-cta" style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); margin: 40px 0;">
    <div class="section-container">
      <h2 style="color: white;">Need Help With Your Tax Situation?</h2>
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

# Find all blog HTML files (skip index)
blog_files = glob.glob('_site/blog/*/index.html')

for filepath in blog_files:
    # Skip blog index page
    if filepath == '_site/blog/index.html':
        continue

    # Skip if already has phone section
    with open(filepath, 'r') as f:
        content = f.read()

    if 'Need Help With Your Tax Situation?' in content:
        print(f'Skipping {filepath} - already has phone section')
        continue

    # Add phone section before the last </article> (which is right before </main>)
    # Find the position of </main>
    main_pos = content.find('</main>')
    if main_pos == -1:
        print(f'Skipping {filepath} - no </main> tag found')
        continue

    # Find the </article> that comes right before </main>
    before_main = content[:main_pos]
    article_pos = before_main.rfind('</article>')

    if article_pos == -1:
        print(f'Skipping {filepath} - no </article> tag found before </main>')
        continue

    # Insert phone section before that </article>
    updated_content = content[:article_pos] + phone_section + content[article_pos:]

    with open(filepath, 'w') as f:
        f.write(updated_content)

    print(f'Updated {filepath}')

print('Done!')
