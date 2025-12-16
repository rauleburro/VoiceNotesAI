Pod::Spec.new do |s|
  s.name           = 'NativeAudioSession'
  s.version        = '1.0.0'
  s.summary        = 'Native audio session module for VoiceNotesAI'
  s.description    = 'Controls audio output routing between speaker and earpiece'
  s.author         = ''
  s.homepage       = 'https://github.com/example/voicenotesai'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = 'ios/**/*.{h,m,mm,swift,hpp,cpp}'
end
