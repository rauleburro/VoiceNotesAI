Pod::Spec.new do |s|
  s.name           = 'NativeLevelMeter'
  s.version        = '1.0.0'
  s.summary        = 'Native level meter module for VoiceNotesAI'
  s.description    = 'Streams live microphone audio levels for visual feedback'
  s.author         = ''
  s.homepage       = 'https://github.com/example/voicenotesai'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift,hpp,cpp}'
end
